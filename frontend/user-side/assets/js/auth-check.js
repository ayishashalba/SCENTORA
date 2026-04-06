const BASE_URL = "http://51.20.253.239:5000";
const token = localStorage.getItem("token");

if (!token) {
  window.location.replace("/user-side/auth/login.html");
} else {
  fetch(`${BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: "Bearer " + token
    }
  })
    .then(async (res) => {
      if (!res.ok) {
        localStorage.removeItem("token");
        window.location.replace("/user-side/auth/login.html");
        return;
      }

      const user = await res.json();

      if (user.isBlocked) {
        localStorage.removeItem("token");
        alert("Your account has been blocked.");
        window.location.replace("/user-side/auth/login.html");
      }
    })
    .catch((err) => {
      console.error("Auth check failed:", err);
      localStorage.removeItem("token");
      window.location.replace("/user-side/auth/login.html");
    });
}