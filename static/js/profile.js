document.addEventListener('DOMContentLoaded', function () {
    updateProfile();
    handlePreferences();
});


function updateProfile() {
    document.getElementById('profileForm').addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent default form submission

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


function handlePreferences(){
    document.querySelectorAll('.preferences-list input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            let selectedPreferences = Array.from(document.querySelectorAll('.preferences-list input[type="checkbox"]:checked'))
                .map(checkbox => checkbox.value);
            console.log('Selected Preferences:', selectedPreferences);

            fetch('/update-preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ preferences: selectedPreferences })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log(data.success);
                } else {
                    alert('Error: ' + data.error);
                }
            })
        });
    });
}

