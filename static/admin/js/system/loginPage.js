document.addEventListener('DOMContentLoaded', () => {
    const ssio_userpin = new bootstrap.Modal(document.getElementById('ssio_userpin'));
    ssio_userpin.show();

    const pinInputs = document.querySelectorAll('.pin-input');
    const pinForm = document.getElementById('ssio_userpin_form'); // fixed here

    pinInputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            if (input.value.length === 1 && index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value === '' && index > 0) {
                pinInputs[index - 1].focus();
            }
        });
    });

    pinForm.addEventListener('submit', () => {
        const fullPin = Array.from(pinInputs).map(input => input.value).join('');
        let hiddenInput = pinForm.querySelector('input[name="ssio_userpin"]');

        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'ssio_userpin';
            pinForm.appendChild(hiddenInput);
        }

        hiddenInput.value = fullPin;
    });
});
