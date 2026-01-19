<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE");
header("Access-Control-Expose-Headers: X-New-Nonce");
// header('Content-type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(200);
	exit();
}

include './credentials.php';
include './auth.php';

// Set up the connection
$conn = new mysqli($host_name, $user_name, $password, $database);
if ($conn->connect_errno) {
	// die('Error' . $conn->connect_error);
	die('Connection error');
}
$conn->set_charset('utf8mb4');

// This is apparently how PHP handles reading POST data
$data = json_decode(file_get_contents('php://input'), true);
if ($data == NULL) {
	die('No data');
}

// Authenticate user
$newNonce = authenticate($conn, $data['_user'], $data['_nonce']);
if ($newNonce === false) {
	http_response_code(401);
	die('Unauthorized');
}

// Convert and sanitize data
$data['_created'] = isset($data['_created']) ? intval($data['_created']) : null;
$data['_edited'] = isset($data['_edited']) ? intval($data['_edited']) : null;
$data['date'] = isset($data['date']) ? intval($data['date']) : null;

// convert the tags array into a deduplicated, no-nulls-allowed, comma-separated string
if (isset($data['tags']) && is_array($data['tags'])) {
	$data['tags'] = '"' . implode('", "', array_unique(array_filter(array_map('trim', $data['tags'])))) . '"';
	if ($data['tags'] == '""') {
		$data['tags'] = NULL;
	}
} else {
	$data['tags'] = NULL;
}

// Decide if this is an insert or an update:

// Check for duplicate slug before insert
if (empty($data['id'])) {
	if (!empty($data['slug'])) {
		$stmt = $conn->prepare("SELECT id FROM `pool` WHERE slug=?");
		$stmt->bind_param("s", $data['slug']);
		$stmt->execute();
		$result = $stmt->get_result();
		if ($result && $result->num_rows > 0) {
			$stmt->close();
			http_response_code(409); // Conflict
			echo json_encode(['error' => 'Duplicate slug']);
			exit();
		}
		$stmt->close();
	}
	$action = "insert";
} else {
	$stmt = $conn->prepare("SELECT `id` FROM `pool` WHERE id=?");
	$stmt->bind_param("s", $data['id']);
	$stmt->execute();
	$result = $stmt->get_result();
	if ($result->num_rows > 0) {
		$action = "update";
	} else {
		$action = "insert";
	}
	$stmt->close();
}

if ($action == "insert") {
	// Build parameterized insert
	$fields = ['id', 'slug', 'title', 'body', '_created', '_edited', 'date', 'img', 'f', 'mm', 'iso', 'shutter', 'tags'];
	$cols = [];
	$vals = [];
	$types = '';
	$params = [];
	
	foreach ($fields as $field) {
		if (isset($data[$field]) && $data[$field] !== null && $data[$field] !== '') {
			$cols[] = "`$field`";
			$vals[] = '?';
			if (in_array($field, ['_created', '_edited', 'date'])) {
				$types .= 'i';
			} else {
				$types .= 's';
			}
			$params[] = &$data[$field];
		}
	}
	
	$sql = "INSERT INTO `pool` (" . implode(',', $cols) . ") VALUES (" . implode(',', $vals) . ")";
	$stmt = $conn->prepare($sql);
	if (!empty($params)) {
		array_unshift($params, $types);
		call_user_func_array([$stmt, 'bind_param'], $params);
	}
	if (!$stmt->execute()) {
		$stmt->close();
		die('Error: ' . $conn->error);
	}
	$id = $conn->insert_id;
	$stmt->close();
} else {
	// Build parameterized update
	$always_update = ['title', 'body', 'date', 'img', 'f', 'mm', 'iso', 'shutter', 'tags'];
	$conditional_update = ['_created', '_edited'];
	
	$sets = [];
	$types = '';
	$bindValues = []; // Store actual values to avoid reference issues
	
	foreach ($always_update as $field) {
		$sets[] = "$field=?";
		if ($field === 'date') {
			$types .= 'i';
		} else {
			$types .= 's';
		}
		$bindValues[] = isset($data[$field]) ? $data[$field] : '';
	}
	
	foreach ($conditional_update as $field) {
		if (isset($data[$field]) && $data[$field]) {
			$sets[] = "$field=?";
			$types .= 'i';
			$bindValues[] = $data[$field];
		}
	}
	
	$types .= 's'; // for WHERE id
	$bindValues[] = $data['id'];
	
	// Create references for bind_param
	$params = [$types];
	foreach ($bindValues as $key => $value) {
		$params[] = &$bindValues[$key];
	}
	
	$sql = "UPDATE `pool` SET " . implode(',', $sets) . " WHERE `id`=?";
	$stmt = $conn->prepare($sql);
	call_user_func_array([$stmt, 'bind_param'], $params);
	if (!$stmt->execute()) {
		$stmt->close();
		die('Error: ' . $conn->error);
	}
	$id = $data['id'];
	$stmt->close();
}

// return the full row that was updated.  WARN hardcoded protocol
header('X-New-Nonce: ' . $newNonce);
echo file_get_contents("http://" . $_SERVER['SERVER_NAME'] . "/api/pool.php?id=" . $id);

?>