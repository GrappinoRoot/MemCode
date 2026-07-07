<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/database.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo non supportato']);
    exit;
}

$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON malformato']);
    exit;
}

$action = $input['action'] ?? '';

// REGISTRAZIONE
if ($action === 'register') {
    $username = trim($input['username'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (!$username || !$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Tutti i campi sono obbligatori']);
        exit;
    }

    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'La password deve essere almeno 6 caratteri']);
        exit;
    }

    // Verifica se email o username esistono già
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email OR username = :username');
    $stmt->execute([':email' => $email, ':username' => $username]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Email o username già registrati']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare('INSERT INTO users (username, email, password_hash) VALUES (:username, :email, :hash)');
    $stmt->execute([
        ':username' => $username,
        ':email' => $email,
        ':hash' => $hash,
    ]);

    $userId = $pdo->lastInsertId();
    $token = bin2hex(random_bytes(32));

    $stmt = $pdo->prepare('INSERT INTO sessions (user_id, token) VALUES (:user_id, :token)');
    $stmt->execute([':user_id' => $userId, ':token' => $token]);

    http_response_code(201);
    echo json_encode([
        'message' => 'Registrazione completata',
        'token' => $token,
        'user' => ['id' => $userId, 'username' => $username, 'email' => $email]
    ]);
    exit;
}

// LOGIN
if ($action === 'login') {
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Email e password richieste']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Email o password errati']);
        exit;
    }

    $token = bin2hex(random_bytes(32));

    $stmt = $pdo->prepare('INSERT INTO sessions (user_id, token) VALUES (:user_id, :token)');
    $stmt->execute([':user_id' => $user['id'], ':token' => $token]);

    echo json_encode([
        'message' => 'Login effettuato',
        'token' => $token,
        'user' => ['id' => $user['id'], 'username' => $user['username'], 'email' => $user['email']]
    ]);
    exit;
}

// LOGOUT
if ($action === 'logout') {
    $token = $input['token'] ?? '';
    if ($token) {
        $stmt = $pdo->prepare('DELETE FROM sessions WHERE token = :token');
        $stmt->execute([':token' => $token]);
    }
    echo json_encode(['message' => 'Logout effettuato']);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Azione non valida. Usa: register, login, logout']);
