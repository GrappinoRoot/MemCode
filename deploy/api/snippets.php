<?php

// CORS per permettere richieste dal frontend
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/database.php';

function sanitizeInput($data) {
    if (is_string($data)) {
        return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
    }
    return $data;
}

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// GET: Recuperare tutti gli snippet
if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM snippets ORDER BY created_at DESC');
    $snippets = $stmt->fetchAll();
    echo json_encode($snippets, JSON_UNESCAPED_UNICODE);
    return;
}

// POST: Creare un nuovo snippet
if ($method === 'POST') {
    $rawBody = file_get_contents('php://input');
    $input = json_decode($rawBody, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'JSON malformato']);
        return;
    }

    if (empty($input) || empty(trim($input['title'] ?? '')) || empty(trim($input['code'] ?? '')) || empty(trim($input['notes'] ?? ''))) {
        http_response_code(400);
        echo json_encode(['error' => 'Tutti i campi obbligatori sono richiesti: title, code, notes']);
        return;
    }

    $stmt = $pdo->prepare('
        INSERT INTO snippets (title, language, category, code, notes)
        VALUES (:title, :language, :category, :code, :notes)
    ');

    $stmt->execute([
        ':title' => sanitizeInput($input['title']),
        ':language' => sanitizeInput($input['language'] ?? 'other'),
        ':category' => sanitizeInput($input['category'] ?? ''),
        ':code' => $input['code'],
        ':notes' => sanitizeInput($input['notes']),
    ]);

    $newId = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM snippets WHERE id = :id');
    $stmt->execute([':id' => $newId]);
    $snippet = $stmt->fetch();

    http_response_code(201);
    echo json_encode($snippet, JSON_UNESCAPED_UNICODE);
    return;
}

// PUT: Aggiornare uno snippet
if ($method === 'PUT') {
    $rawBody = file_get_contents('php://input');
    $input = json_decode($rawBody, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'JSON malformato']);
        return;
    }

    $id = $input['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID richiesto per l\'aggiornamento']);
        return;
    }

    $stmt = $pdo->prepare('SELECT * FROM snippets WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $existing = $stmt->fetch();

    if (!$existing) {
        http_response_code(404);
        echo json_encode(['error' => 'Snippet non trovato']);
        return;
    }

    $stmt = $pdo->prepare('
        UPDATE snippets
        SET title = :title, language = :language, category = :category, code = :code, notes = :notes
        WHERE id = :id
    ');

    $stmt->execute([
        ':title' => sanitizeInput($input['title'] ?? $existing['title']),
        ':language' => sanitizeInput($input['language'] ?? $existing['language']),
        ':category' => sanitizeInput($input['category'] ?? $existing['category'] ?? ''),
        ':code' => $input['code'] ?? $existing['code'],
        ':notes' => sanitizeInput($input['notes'] ?? $existing['notes']),
        ':id' => $id,
    ]);

    $stmt = $pdo->prepare('SELECT * FROM snippets WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $snippet = $stmt->fetch();

    echo json_encode($snippet, JSON_UNESCAPED_UNICODE);
    return;
}

// DELETE: Eliminare uno snippet
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        $rawBody = file_get_contents('php://input');
        $input = json_decode($rawBody, true);
        $id = $input['id'] ?? null;
    }

    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID richiesto per l\'eliminazione']);
        return;
    }

    $stmt = $pdo->prepare('SELECT * FROM snippets WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $existing = $stmt->fetch();

    if (!$existing) {
        http_response_code(404);
        echo json_encode(['error' => 'Snippet non trovato']);
        return;
    }

    $stmt = $pdo->prepare('DELETE FROM snippets WHERE id = :id');
    $stmt->execute([':id' => $id]);

    echo json_encode(['message' => 'Snippet eliminato con successo', 'id' => (int)$id]);
    return;
}

http_response_code(405);
echo json_encode(['error' => 'Metodo non supportato']);