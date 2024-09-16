document.addEventListener('DOMContentLoaded', function () {
    updateProfile();
});


function updateProfile() {
    document.getElementById('profileForm').addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the default form submission

        // Collect form data
        const formData = new FormData(this);
        const data = {
            name: formData.get('username'),
            email: formData.get('email'),
            old_password: formData.get('oldpassword'),
            new_password: formData.get('password')
        };

        // Send the data as JSON
        fetch('/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.success);
                window.location.reload(); // Reload to reflect changes
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => console.error('Error:', error));
    });
}