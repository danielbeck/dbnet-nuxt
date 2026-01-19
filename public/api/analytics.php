<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE");
header('Content-type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include './credentials.php';

$conn = new mysqli($host_name, $user_name, $password, $database);
if ($conn->connect_errno) {
    die('Connection error');
}
$conn->set_charset('utf8mb4');

$sql = "SELECT * FROM analytics ORDER BY date DESC";
if (!$result = $conn->query($sql)) {
    die('Error: ' . $conn->error);
}

$rows = array();
while ($row = $result->fetch_assoc()) {
    $rows[] = $row;
}
echo json_encode($rows);
?>