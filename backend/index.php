<?php

// Configurazione CORS più restrittiva (sostituisci con il tuo dominio in produzione)
$allowedOrigin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $allowedOrigin");
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

// Gestione preflight OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config/database.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'snippets':
        require_once __DIR__ . '/api/snippets.php';
        handleSnippets();
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Azione non trovata']);
        break;
}