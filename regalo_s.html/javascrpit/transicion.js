document.addEventListener("DOMContentLoaded", () => {
    const btnComenzar = document.getElementById('btnComenzar');
    const seccionInicio = document.getElementById('seccionInicio');

    if (btnComenzar && seccionInicio) {
        btnComenzar.addEventListener('click', function(e) {
            e.preventDefault(); // Detiene el salto instantáneo de página
            
            const destino = this.getAttribute('href');
            
            // Lanza la animación visual de desvanecimiento y expansión
            seccionInicio.classList.add('ingresando-galaxia');
            
            // Espera a que termine la animación y cambia de página
            setTimeout(() => {
                window.location.href = destino;
            }, 2500);
        });
    }
});