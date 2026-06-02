window.addEventListener('load', () => {
    const canvas = document.getElementById('galaxyCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Detectamos si es celular desde el primer segundo
    let esCelular = window.innerWidth < 768;

    // =========================================================================
    // 🌌 ACTUALIZACIÓN EN TIEMPO REAL (RESIZE)
    // =========================================================================
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;

        let eraCelular = esCelular;
        esCelular = window.innerWidth < 768;

        if (eraCelular !== esCelular) {
            zoomObjetivo = esCelular ? 0.85 : 1.65;
            minZoom = esCelular ? 0.25 : 0.5;
            maxZoom = esCelular ? 1.6 : 3.5;
        }
    });

    // =========================================================================
    // 🌌 DECLARACIÓN DE VARIABLES DE CONTROL
    // =========================================================================
    let introProgress = 0;
    let zoomCámara = esCelular ? 5.5 : 3.8;
    let zoomObjetivo = esCelular ? 0.85 : 1.65;
    let minZoom = esCelular ? 0.25 : 0.5;
    let maxZoom = esCelular ? 1.6 : 3.5;

    let rotX = 0, rotY = 0;
    let targetRotX = 0, targetRotY = 0;
    const fov = 600;

    let estaArrastrando = false;
    let clickStartX = 0, clickStartY = 0;
    let rotStartX = 0, rotStartY = 0;
    let mouseX = width / 2, mouseY = height / 2;
    let esferaApuntada = null;
    let modalAbierto = false;

    let toqueInicioDistancia = 0;
    let zoomInicio = 1.65;

    // === SISTEMA DE ESTELA DE CORAZÓN ===
    let particulasCorazon = [];
    let corazonEstelaActivo = false;
    let corazonEstelaInicio = 0;
    const DURACION_ESTELA_CORAZON = 5000;

    // =========================================================================
    // 🖥️ INTERACCIONES PARA COMPUTADORA (MOUSE & RUEDA)
    // =========================================================================
    canvas.addEventListener('wheel', (e) => {
        if (modalAbierto) return;
        e.preventDefault();
        zoomObjetivo -= e.deltaY * 0.0015;
        if (zoomObjetivo < minZoom) zoomObjetivo = minZoom;
        if (zoomObjetivo > maxZoom) zoomObjetivo = maxZoom;
    }, { passive: false });

    canvas.addEventListener('mousedown', (e) => {
        if (modalAbierto) return;
        estaArrastrando = true;
        clickStartX = e.clientX;
        clickStartY = e.clientY;
        rotStartX = targetRotX;
        rotStartY = targetRotY;
    });

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (estaArrastrando) {
            const deltaX = e.clientX - clickStartX;
            const deltaY = e.clientY - clickStartY;
            targetRotY = rotStartY + (deltaX * 0.006);
            targetRotX = rotStartX + (deltaY * 0.006);
            if (targetRotX > Math.PI / 2.1) targetRotX = Math.PI / 2.1;
            if (targetRotX < -Math.PI / 2.1) targetRotX = -Math.PI / 2.1;
        }
    });

    window.addEventListener('mouseup', () => {
        estaArrastrando = false;
    });

    window.addEventListener('click', () => {
        if (modalAbierto) return;
        if (esferaApuntada && !estaArrastrando) { abrirTarjeta(esferaApuntada); return; }
        const cxS = width / 2, cyS = height / 2;
        const dxC = mouseX - cxS, dyC = mouseY - cyS;
        const distC = Math.sqrt(dxC * dxC + dyC * dyC);
        if (distC < 16 * 0.9 * zoomCámara + 15 && introProgress > 0.85 && !corazonEstelaActivo) generarEstelaCorazon();
    });

    // =========================================================================
    // 📱 INTERACCIONES PARA MÓVILES (ROTACIÓN CON 1 DEDO Y PELLIZCO PARA ZOOM)
    // =========================================================================
    function obtenerDistanciaToques(t1, t2) {
        return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    }

    canvas.addEventListener('touchstart', (e) => {
        if (modalAbierto) return;

        if (e.touches.length === 1) {
            estaArrastrando = true;
            const toque = e.touches[0];
            clickStartX = toque.clientX;
            clickStartY = toque.clientY;
            rotStartX = targetRotX;
            rotStartY = targetRotY;
            mouseX = toque.clientX;
            mouseY = toque.clientY;
        } else if (e.touches.length === 2) {
            estaArrastrando = false;
            toqueInicioDistancia = obtenerDistanciaToques(e.touches[0], e.touches[1]);
            zoomInicio = zoomObjetivo;
        }
    });

    window.addEventListener('touchmove', (e) => {
        if (modalAbierto) return;

        if (e.touches.length === 1 && estaArrastrando) {
            if (e.cancelable) e.preventDefault();
            const toque = e.touches[0];
            mouseX = toque.clientX;
            mouseY = toque.clientY;

            const deltaX = toque.clientX - clickStartX;
            const deltaY = toque.clientY - clickStartY;
            targetRotY = rotStartY + (deltaX * 0.006);
            targetRotX = rotStartX + (deltaY * 0.006);

            if (targetRotX > Math.PI / 2.1) targetRotX = Math.PI / 2.1;
            if (targetRotX < -Math.PI / 2.1) targetRotX = -Math.PI / 2.1;
        } else if (e.touches.length === 2) {
            if (e.cancelable) e.preventDefault();
            const distNueva = obtenerDistanciaToques(e.touches[0], e.touches[1]);
            if (toqueInicioDistancia > 0) {
                const factor = distNueva / toqueInicioDistancia;
                zoomObjetivo = zoomInicio * factor;
                if (zoomObjetivo < minZoom) zoomObjetivo = minZoom;
                if (zoomObjetivo > maxZoom) zoomObjetivo = maxZoom;
            }
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 1 && !modalAbierto && introProgress > 0.85) {
            const tq = e.changedTouches[0];
            const dArrastre = Math.sqrt(Math.pow(tq.clientX - clickStartX, 2) + Math.pow(tq.clientY - clickStartY, 2));
            const cxS = width / 2, cyS = height / 2;
            const dxC = tq.clientX - cxS, dyC = tq.clientY - cyS;
            const distC = Math.sqrt(dxC * dxC + dyC * dyC);
            if (dArrastre < 15 && distC < 16 * 0.9 * zoomCámara + 15 && !corazonEstelaActivo && !esferaApuntada) generarEstelaCorazon();
        }
        estaArrastrando = false;
        toqueInicioDistancia = 0;
    });

    // =========================================================================
    // 📸 CONFIGURACIÓN DE LAS 8 ESFERAS DE RECUERDOS
    // =========================================================================
    const esferasDatos = [
        { titulo: 'Nuestra primera monada juntos.', texto: 'Aquel dia pasamos la tarde juntos y te lleve en la bici hasta la parada.', imagen: 'img/sele3.jpeg' },
        { titulo: 'La vez que vimos la mejor pelicula de todos los tiempos.', texto: 'Bailamos y boludeamos en la calle muy tarde. ', imagen: 'img/sele1.jpeg' },
        { titulo: 'Nuestras Boludeces', texto: 'Una de las mejores noches que pase con vs, aunque aundaba muy seco 😅.', imagen: 'img/sele2.jpeg' },
        { titulo: 'Primer Viaje', texto: 'Una linda mañana con mates, aunque hizo frio y nos agarro la lluvia.', imagen: 'img/sele5.jpeg' },
        { titulo: 'Tu Sonrisa', texto: 'Mi razon para estar feliz.', imagen: 'img/sele6.jpeg' },
        { titulo: 'Mi mascarilla', texto: 'Cuando me hice mi primera mascarilla con vs, y me dejaste solo porque te dormiste 😒.', imagen: 'img/sele4.jpeg' },
        { titulo: 'Mi hogar', texto: 'Fotos tuyas de pequeña me hacen dar cuenta que sos mi hogar y alguien muy delicada.', imagen: 'img/sele7.jpeg' },
        { titulo: 'Fenix', texto: 'Nuestra historia fue media parecida a la del fenix, que resurge de las cenizas para volver a ser lo que fue.', imagen: 'img/sele8.jpeg' }
    ];

    esferasDatos.forEach((esfera) => {
        esfera.distancia = Math.random() * (550 - 150) + 150;
        esfera.angulo = Math.random() * Math.PI * 2;
        esfera.color = '#ffffff';
        esfera.imageObject = new Image();
        esfera.imageObject.src = esfera.imagen;
        esfera.velocidad = 0;
    });

    // === PARTÍCULAS DE LOS CHORROS POLARES (JETS) ===
    const numParticulasExplosion = 400;
    const particulasExplosion = [];
    for (let i = 0; i < numParticulasExplosion; i++) {
        let colorBase = Math.random() < 0.5 ? 'rgba(255, 145, 75, ' : 'rgba(90, 165, 235, ';
        const esChorroPolor = Math.random() < 0.35;
        let vx, vy, vz;

        if (esChorroPolor) {
            const dir = Math.random() < 0.5 ? 1 : -1;
            vx = (Math.random() - 0.5) * 4;
            vy = (Math.random() * 20 + 10) * dir;
            vz = (Math.random() - 0.5) * 4;
        } else {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const mag = Math.random() * 15 + 5;
            vx = mag * Math.sin(phi) * Math.cos(theta);
            vy = mag * Math.cos(phi) * 0.25;
            vz = mag * Math.sin(phi) * Math.sin(theta);
        }

        particulasExplosion.push({
            x: 0, y: 0, z: 0, vx: vx, vy: vy, vz: vz,
            size: Math.random() * 3 + 1, color: colorBase, alpha: 1,
            decay: Math.random() * 0.012 + 0.006
        });
    }

    // === PARTÍCULAS DE LA ESTELA (POLVO CÓSMICO) ===
    const numParticulasDisco = 1900;
    const particulasDisco = [];
    for (let i = 0; i < numParticulasDisco; i++) {
        const r = Math.random() * 560 + 50;
        const angulo = Math.random() * Math.PI * 2;
        let colorBase;
        const rand = Math.random();
        if (rand < 0.48) {
            colorBase = 'rgba(240, 140, 70, ';
        } else if (rand < 0.92) {
            colorBase = 'rgba(85, 155, 225, ';
        } else {
            colorBase = 'rgba(225, 240, 255, ';
        }
        const tamaño = Math.random() < 0.88 ? (Math.random() * 0.5 + 0.4) : (Math.random() * 1.5 + 1.1);

        particulasDisco.push({
            r: r,
            angulo: angulo,
            yOffset: (Math.random() - 0.5) * (50 * (1 - r / 610)),
            velocidadBase: (1 / Math.sqrt(r)) * 6.8,
            color: colorBase,
            size: tamaño
        });
    }

    // === SISTEMA INTERFAZ MODAL ===
    const modalOverlay = document.getElementById('modalOverlay');
    const modalImg = document.getElementById('modalImg');
    const modalTitle = document.getElementById('modalTitle');
    const modalText = document.getElementById('modalText');
    const btnCerrar = document.getElementById('btnCerrar');

    if (btnCerrar && modalOverlay) {
        btnCerrar.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => { modalAbierto = false; }, 500);
        });
    }

    function abrirTarjeta(datos) {
        modalAbierto = true;
        if (modalImg) modalImg.src = datos.imagen;
        if (modalTitle) modalTitle.innerText = datos.titulo;
        if (modalText) modalText.innerText = datos.texto;
        if (modalOverlay) modalOverlay.classList.add('active');
    }

    function generarEstelaCorazon() {
        particulasCorazon = [];
        corazonEstelaActivo = true;
        corazonEstelaInicio = Date.now();
        const num = 150;
        const esc = esCelular ? 4.5 : 7;
        for (let i = 0; i < num; i++) {
            const t = (i / num) * Math.PI * 2;
            const hx = 16 * Math.pow(Math.sin(t), 3);
            const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            const r = Math.floor(Math.random() * 55 + 200);
            const g = Math.floor(Math.random() * 50 + 20);
            const b = Math.floor(Math.random() * 60 + 40);
            particulasCorazon.push({
                targetX: hx * esc + (Math.random() - 0.5) * 5,
                targetY: hy * esc + (Math.random() - 0.5) * 5,
                x: 0, y: 0,
                size: Math.random() * 2.5 + 1.2,
                delay: (i / num) * 900,
                color: `rgba(${r}, ${g}, ${b}, `
            });
        }
    }

    function dibujarCorazonSingularidad(xCentro, yCentro, escala) {
        const latido = 1 + Math.sin(Date.now() * 0.005) * 0.08;
        const escalaFinal = escala * latido;
        ctx.save();
        ctx.beginPath();
        ctx.translate(xCentro, yCentro);
        ctx.scale(escalaFinal, -escalaFinal);
        for (let t = 0; t < Math.PI * 2; t += 0.04) {
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.shadowBlur = 30; ctx.shadowColor = '#ff3b63'; ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.fillStyle = 'rgba(235, 15, 65, 0.9)'; ctx.fill();
        ctx.restore();
    }

    // === BUCLE DE ANIMACIÓN PRINCIPAL ===
    function animate() {
        ctx.fillStyle = 'rgba(1, 1, 5, 0.22)'; ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';
        const cx = width / 2; const cy = height / 2;

        rotX += (targetRotX - rotX) * 0.05; rotY += (targetRotY - rotY) * 0.05;
        if (introProgress < 1) { introProgress += (1.005 - introProgress) * 0.015; if (introProgress > 0.999) introProgress = 1; }
        zoomCámara += (zoomObjetivo - zoomCámara) * 0.05;

        const cosX = Math.cos(rotX), sinX = Math.sin(rotX); const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

        // --- CÁLCULO DE RADIO DINÁMICO ---
        let proporcionPantalla = Math.min(width, height) / 800;

        let radioBase = esCelular ? 22 : 38;
        let radioDinamico = radioBase * proporcionPantalla;

        let limiteMinimo = esCelular ? 12 : 18;
        let limiteMaximo = esCelular ? 26 : 45;

        radioDinamico = Math.max(limiteMinimo, Math.min(radioDinamico, limiteMaximo));

        // 1. RENDER EXPLOSIÓN INICIAL 3D
        for (let i = 0; i < particulasExplosion.length; i++) {
            const p = particulasExplosion[i]; if (p.alpha <= 0) continue;
            p.x += p.vx; p.y += p.vy; p.z += p.vz; p.alpha -= p.decay;
            let x1 = p.x * cosY - p.z * sinY; let z1 = p.x * sinY + p.z * cosY;
            let y2 = p.y * cosX - z1 * sinX; let z2 = p.y * sinX + z1 * cosX;
            if (z2 <= -fov + 60) continue;
            let perspectiva = (fov / (fov + z2)) * zoomCámara; if (perspectiva > 8) perspectiva = 8;
            const pX = cx + x1 * perspectiva; const pY = cy + y2 * perspectiva;
            if (pX >= 0 && pX <= width && pY >= 0 && pY <= height) {
                ctx.beginPath(); ctx.arc(pX, pY, Math.max(0.1, p.size * (perspectiva / zoomCámara)), 0, Math.PI * 2);
                ctx.fillStyle = p.color + Math.max(0, p.alpha) + ')'; ctx.fill();
            }
        }

        // 2. RENDER ESTELA (POLVO CÓSMICO)
        for (let i = 0; i < numParticulasDisco; i++) {
            const p = particulasDisco[i];
            p.angulo += p.velocidadBase * 0.65;
            const radioActual = p.r * Math.min(1, introProgress * 1.3);
            let xBase = Math.cos(p.angulo) * radioActual; let zBase = Math.sin(p.angulo) * radioActual;
            let yBase = p.yOffset * Math.min(1, introProgress * 1.3);
            let xRot = xBase * cosY - zBase * sinY; let zRot1 = xBase * sinY + zBase * cosY;
            let yRot = yBase * cosX - zRot1 * sinX; let zRotFinal = yBase * sinX + zRot1 * cosX;
            if (zRotFinal <= -fov + 60) continue;
            let perspectiva = (fov / (fov + zRotFinal)) * zoomCámara; if (perspectiva > 8) perspectiva = 8;
            const alphaActual = Math.min(1, (560 - p.r) / 250) * Math.min(1, introProgress * 2.5);
            const pX = cx + xRot * perspectiva; const pY = cy + yRot * perspectiva;
            if (alphaActual > 0 && pX >= 0 && pX <= width && pY >= 0 && pY <= height) {
                ctx.beginPath(); ctx.arc(pX, pY, Math.max(0.1, p.size * (perspectiva / zoomCámara)), 0, Math.PI * 2);
                ctx.fillStyle = p.color + alphaActual + ')'; ctx.fill();
            }
        }

        // 3. SINGULARIDAD CENTRAL (CORAZÓN LATIENTE)
        let factorBrote = 0; if (introProgress > 0.2) { const tBrote = Math.min(1, (introProgress - 0.2) / 0.8); const periodo = 0.35; factorBrote = Math.pow(2, -10 * tBrote) * Math.sin((tBrote - periodo / 4) * (Math.PI * 2) / periodo) + 1; }
        if (factorBrote > 0) dibujarCorazonSingularidad(cx, cy, 0.90 * factorBrote * zoomCámara);

        // 3.5 ESTELA DE CORAZÓN INTERACTIVA
        if (corazonEstelaActivo) {
            const tEst = Date.now() - corazonEstelaInicio;
            if (tEst > DURACION_ESTELA_CORAZON) { corazonEstelaActivo = false; particulasCorazon = []; }
            else {
                const fadeOut = tEst > 3500 ? 1 - (tEst - 3500) / 1500 : 1;
                // Halo central único (reemplaza 150 shadowBlurs costosos)
                if (fadeOut > 0) {
                    const haloR = esCelular ? 80 : 130;
                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
                    grad.addColorStop(0, 'rgba(255, 32, 80, ' + (0.25 * fadeOut) + ')');
                    grad.addColorStop(1, 'rgba(255, 32, 80, 0)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(cx - haloR, cy - haloR, haloR * 2, haloR * 2);
                }
                for (let i = 0; i < particulasCorazon.length; i++) {
                    const p = particulasCorazon[i];
                    if (tEst < p.delay) continue;
                    const tL = tEst - p.delay;
                    const prog = Math.min(1, tL / 1000);
                    const ease = 1 - Math.pow(1 - prog, 3);
                    p.x = p.targetX * ease;
                    p.y = p.targetY * ease;
                    const alpha = fadeOut * Math.min(1, tL / 300);
                    if (alpha > 0) {
                        const pX = cx + p.x, pY = cy + p.y;
                        ctx.beginPath();
                        ctx.arc(pX, pY, p.size * (1 + (1 - prog) * 1.5), 0, Math.PI * 2);
                        ctx.fillStyle = p.color + alpha + ')'; ctx.fill();
                    }
                }
            }
        }

        // 4. ÓRBITAS DE LAS ESFERAS CON IMÁGENES
        let cursorEnEsfera = false; if (!modalAbierto) esferaApuntada = null;
        for (let i = 0; i < esferasDatos.length; i++) {
            const e = esferasDatos[i];
            const distActual = e.distancia * Math.min(1, introProgress * 1.08);
            const alphaEsfera = Math.max(0, Math.min(1, (introProgress - 0.3) * 2.5));
            let eX_base = Math.cos(e.angulo) * distActual; let eZ_base = Math.sin(e.angulo) * distActual;
            let eX_rot = eX_base * cosY - eZ_base * sinY; let eZ_rot1 = eX_base * sinY + eZ_base * cosY;
            let eY_rot = -eZ_rot1 * sinX; let eZ_rotFinal = eZ_rot1 * cosX;
            if (eZ_rotFinal <= -fov + 60) continue;
            let perspectivaPlaneta = (fov / (fov + eZ_rotFinal)) * zoomCámara;
            if (perspectivaPlaneta > 8) perspectivaPlaneta = 8;
            const eX = cx + eX_rot * perspectivaPlaneta; const eY = cy + eY_rot * perspectivaPlaneta;

            const dx = mouseX - eX; const dy = mouseY - eY; const distanciaMouse = Math.sqrt(dx * dx + dy * dy);
            let esHover = false;

            // Radio que escala con la perspectiva 3D y se normaliza contra el zoom
            const radioFinalPerspectiva = radioDinamico * (perspectivaPlaneta / zoomCámara) * Math.min(1, introProgress);

            if (distanciaMouse < radioFinalPerspectiva + 12 && !modalAbierto && introProgress > 0.85) { esHover = true; cursorEnEsfera = true; esferaApuntada = e; }

            if (alphaEsfera > 0) {
                ctx.save();
                ctx.globalAlpha = alphaEsfera;
                ctx.beginPath();
                ctx.arc(eX, eY, radioFinalPerspectiva * 1.7, 0, Math.PI * 2);
                ctx.shadowBlur = esHover ? 50 : 30; ctx.shadowColor = e.color;
                ctx.strokeStyle = 'rgba(255, 60, 90, 0.22)'; ctx.lineWidth = 1; ctx.stroke();

                ctx.beginPath();
                ctx.arc(eX, eY, esHover ? radioFinalPerspectiva * 1.35 : radioFinalPerspectiva, 0, Math.PI * 2);
                ctx.fillStyle = esHover ? '#ffffff' : e.color; ctx.fill();
                ctx.restore();

                if (e.imageObject.complete && e.imageObject.naturalWidth > 0 && alphaEsfera > 0.5) {
                    ctx.save();
                    ctx.globalAlpha = alphaEsfera - 0.2;
                    ctx.beginPath();
                    ctx.arc(eX, eY, esHover ? radioFinalPerspectiva * 1.3 : radioFinalPerspectiva * 0.95, 0, Math.PI * 2);
                    ctx.clip();
                    const imgSize = (esHover ? radioFinalPerspectiva * 2.6 : radioFinalPerspectiva * 1.9);
                    ctx.drawImage(e.imageObject, eX - imgSize / 2, eY - imgSize / 2, imgSize, imgSize);
                    ctx.restore();
                }
            }
        }

        if (cursorEnEsfera && !modalAbierto) document.body.style.cursor = 'pointer'; else if (estaArrastrando) document.body.style.cursor = 'grabbing'; else document.body.style.cursor = 'default';
        ctx.globalCompositeOperation = 'source-over'; requestAnimationFrame(animate);
    }

    // ¡ESTE ERA EL COMANDO QUE SE HABÍA BORRADO Y DEJABA LA PANTALLA NEGRA!
    animate();

    // === REPRODUCTOR DE MÚSICA AMBIENTAL ===
    const musica = document.getElementById('musicaFondo');
    window.addEventListener('pointerdown', () => {
        if (musica && musica.paused) {
            musica.volume = 0.3;
            musica.play()
                .catch(error => console.log("Esperando interacción...", error));
        }
    });
});