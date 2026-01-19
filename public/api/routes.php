<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");
header('Content-type: application/json');

include './credentials.php';

$conn = new mysqli($host_name, $user_name, $password, $database);
if ($conn->connect_errno) {
	die('Error: ' . $conn->connect_err); // .mysql_error()
}

// WARN pages like "home" and "photos" which don't have a tag will need to link to the correct path, not just to their own subdirectory.
$sql = "
SELECT path FROM page WHERE 1
UNION
SELECT CONCAT(page.path, pool.slug, '.html') FROM page, pool
	WHERE page.tag IS NOT NULL
	AND length(page.tag)>0
	AND pool.tags LIKE CONCAT('%', page.tag, '%')
UNION
SELECT CONCAT(page.path, pool.id, '.html') FROM page, pool
	WHERE page.tag IS NOT NULL
	AND length(page.tag)>0
	AND pool.tags LIKE CONCAT('%', page.tag, '%')
ORDER BY path";

if (!$result = $conn->query($sql)) {
	die('Error: ' . $conn->error);
}

$output = array();

while ($row = $result->fetch_assoc()) {
	$output[] = $row['path'];
}

echo json_encode($output)
?>