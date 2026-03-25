// assets/js/auth-check.js

// Logout function
function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "auth/login.html"; // redirect to login
}

// Check user status
async function checkUserStatus() {
    const token = localStorage.getItem("token");
    if (!token) return; // not logged in

    try {
        const res = await fetch("http://localhost:5000/api/user", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            logoutUser();
            return;
        }

        const user = await res.json();

        if (user.isBlocked) {
            alert("Your account has been blocked by the admin.");
            logoutUser();
        }

    } catch (err) {
        console.error("Failed to check user status", err);
        logoutUser(); // fail-safe
    }
}

// Run on page load
document.addEventListener("DOMContentLoaded", checkUserStatus);