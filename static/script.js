document.addEventListener("DOMContentLoaded", function () {

    const panicBtn = document.getElementById("panicBtn");

    if (panicBtn) {

        panicBtn.addEventListener("click", function () {

            if (!navigator.geolocation) {
                alert("Geolocation not supported");
                return;
            }

            alert("🚨 Live tracking started!");

            // Track every 5 seconds
            setInterval(() => {
                navigator.geolocation.getCurrentPosition(function(position) {

                    fetch("/live_location", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        })
                    });

                });
            }, 5000); // every 5 sec