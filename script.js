const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let objetos = [];
let animacionesChoque = [];
let contador = 0;
let interaccionIniciada = false;

// Carga de Assets
const imagen = new Image();
imagen.src = "assets/img/llama.png";

const audio = new Audio("assets/audio/audio.mp3");
audio.loop = true;

// Clase para las animaciones de colisión
class AnimacionChoque {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radio = 5;
        this.opacidad = 1;
    }

    dibujar() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 100, 100, ${this.opacidad})`;
        ctx.fill();
        ctx.restore();
    }

    actualizar() {
        this.radio += 2; // Expansión
        this.opacidad -= 0.1; // Desvanecimiento
    }
}

// Clase Objeto (Fantasma)
class Objeto {
    constructor(x, y, img) {
        this.size = 40;
        this.x = x;
        this.y = y;
        this.img = img;
        
        // Asignación de velocidad aleatoria base
        this.velocidadX = (Math.random() * 4) - 2 || 1; 
        this.velocidadY = (Math.random() * 4) - 2 || 1;
        
        // Determinar patrón de movimiento: lineal (diagonal/arriba/abajo) o circular
        this.esCircular = Math.random() > 0.7; // 30% de probabilidad de ser circular
        this.angulo = Math.random() * Math.PI * 2;
        this.radioGiro = Math.random() * 3 + 2;
        this.centroX = x;
        this.centroY = y;
    }

    dibujar() {
        ctx.drawImage(this.img, this.x, this.y, this.size, this.size);
    }

    mover() {
        if (this.esCircular) {
            this.angulo += 0.05;
            // El centro se mueve para que no gire en el mismo lugar estático
            this.centroX += this.velocidadX;
            this.centroY += this.velocidadY;
            
            this.x = this.centroX + Math.cos(this.angulo) * this.radioGiro;
            this.y = this.centroY + Math.sin(this.angulo) * this.radioGiro;
            
            // Rebote de los centros para objetos circulares
            this.checarBordes(this.centroX, this.centroY, true);
        } else {
            this.x += this.velocidadX;
            this.y += this.velocidadY;
            // Rebote normal
            this.checarBordes(this.x, this.y, false);
        }
    }

    checarBordes(ejeX, ejeY, esCentro) {
        if (ejeX <= 0 || ejeX >= canvas.width - this.size) {
            this.velocidadX *= -1;
            if (esCentro) this.centroX = Math.max(1, Math.min(ejeX, canvas.width - this.size - 1));
            else this.x = Math.max(1, Math.min(ejeX, canvas.width - this.size - 1));
        }
        if (ejeY <= 0 || ejeY >= canvas.height - this.size) {
            this.velocidadY *= -1;
            if (esCentro) this.centroY = Math.max(1, Math.min(ejeY, canvas.height - this.size - 1));
            else this.y = Math.max(1, Math.min(ejeY, canvas.height - this.size - 1));
        }
    }
}

// Inicializar los 25 objetos
function inicializarJuego() {
    for (let i = 0; i < 25; i++) {
        agregarFantasmaAleatorio();
    }
}

function agregarFantasmaAleatorio() {
    let x = Math.random() * (canvas.width - 40);
    let y = Math.random() * (canvas.height - 40);
    objetos.push(new Objeto(x, y, imagen));
}

// Físicas de colisión mejoradas (Círculo de bounding en lugar de caja)
function detectarColisiones() {
    for (let i = 0; i < objetos.length; i++) {
        for (let j = i + 1; j < objetos.length; j++) {
            let a = objetos[i];
            let b = objetos[j];
            
            // Calcular centro y distancia
            let dx = (b.x + b.size/2) - (a.x + a.size/2);
            let dy = (b.y + b.size/2) - (a.y + a.size/2);
            let distancia = Math.sqrt(dx * dx + dy * dy);
            
            if (distancia < a.size) { // Chocaron
                // Intercambio simple de vectores para rebotar
                let tempX = a.velocidadX;
                let tempY = a.velocidadY;
                a.velocidadX = b.velocidadX;
                a.velocidadY = b.velocidadY;
                b.velocidadX = tempX;
                b.velocidadY = tempY;

                // Separarlos un poco para evitar que se queden pegados (Glitch)
                let superposicion = (a.size - distancia) / 2;
                a.x -= (dx / distancia) * superposicion;
                a.y -= (dy / distancia) * superposicion;
                b.x += (dx / distancia) * superposicion;
                b.y += (dy / distancia) * superposicion;

                // Registrar animación de choque en el punto intermedio
                let puntoChoqueX = a.x + a.size/2 + (dx / 2);
                let puntoChoqueY = a.y + a.size/2 + (dy / 2);
                animacionesChoque.push(new AnimacionChoque(puntoChoqueX, puntoChoqueY));
            }
        }
    }
}

// Bucle principal de renderizado
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mover y dibujar objetos
    objetos.forEach(obj => {
        obj.mover();
        obj.dibujar();
    });

    detectarColisiones();

    // Dibujar y limpiar animaciones de choque
    for (let i = animacionesChoque.length - 1; i >= 0; i--) {
        let anim = animacionesChoque[i];
        anim.actualizar();
        anim.dibujar();
        if (anim.opacidad <= 0) {
            animacionesChoque.splice(i, 1); // Eliminar cuando ya no se ve
        }
    }

    requestAnimationFrame(gameLoop);
}

// Evento de Clic: Cazador
canvas.addEventListener("click", function(e) {
    // Iniciar audio en el primer clic por políticas del navegador
    if (!interaccionIniciada) {
        audio.play().catch(err => console.log("Audio en espera de interacción."));
        interaccionIniciada = true;
    }

    let rect = canvas.getBoundingClientRect();
    // Ajustar por si el canvas está escalado por Bootstrap
    let scaleX = canvas.width / rect.width;
    let scaleY = canvas.height / rect.height;
    let mouseX = (e.clientX - rect.left) * scaleX;
    let mouseY = (e.clientY - rect.top) * scaleY;

    for (let i = objetos.length - 1; i >= 0; i--) {
        let obj = objetos[i];
        if (
            mouseX >= obj.x &&
            mouseX <= obj.x + obj.size &&
            mouseY >= obj.y &&
            mouseY <= obj.y + obj.size
        ) {
            contador++;
            document.getElementById("contador").textContent = contador;
            
            // Eliminar el objeto clickeado y crear uno nuevo en otra zona
            objetos.splice(i, 1);
            agregarFantasmaAleatorio();
            break; // Solo elimina un fantasma por clic
        }
    }
});

// Arrancar cuando la imagen esté lista
imagen.onload = () => {
    inicializarJuego();
    gameLoop();
};