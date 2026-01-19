<?php
// Authentication helper function
// Returns false if not authenticated, new nonce if authenticated
// Also updates nonce on successful auth
function authenticate($conn, $user, $nonce) {
    if (empty($user) || empty($nonce)) {
        return false;
    }
    
    // Get user data using prepared statement
    $stmt = $conn->prepare("SELECT * FROM `user` WHERE `user`=?");
    $stmt->bind_param("s", $user);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if (!$result || $result->num_rows === 0) {
        $stmt->close();
        return false;
    }
    
    $data = $result->fetch_assoc();
    $stmt->close();
    
    // Verify nonce
    if (intval($nonce) != $data['nonce']) {
        return false;
    }
    
    // Generate new nonce for next request
    $newNonce = rand(1, 65535);
    $stmt = $conn->prepare("UPDATE `user` SET `nonce`=? WHERE `user`=?");
    $stmt->bind_param("is", $newNonce, $user);
    $stmt->execute();
    $stmt->close();
    
    // Return the new nonce so it can be sent back to client
    return $newNonce;
}
?>
