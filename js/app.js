class TetrahedronApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.tetrahedron = null;
        this.vertexSpheres = [];
        this.selectedVertex = 'ψ₁';
        
        this.rothModule = null;
        this.isWasmLoaded = false;
        
        this.init();
        this.loadWASM();
    }
    
    init() {
        // Three.js setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
        document.getElementById('container').appendChild(this.renderer.domElement);
        
        // Camera controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.camera.position.z = 8;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        this.scene.add(directionalLight);
        
        // Create tetrahedron
        this.createTetrahedron();
        
        // Start animation loop
        this.animate();
        this.updateCoordinates();
        
        // Initial vertex selection
        this.selectVertex('ψ₁');
    }
    
    createTetrahedron() {
        // Tetrahedron geometry
        const geometry = new THREE.TetrahedronGeometry(2.5);
        const material = new THREE.MeshPhongMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.2,
            wireframe: false,
            side: THREE.DoubleSide
        });
        
        this.tetrahedron = new THREE.Mesh(geometry, material);
        this.scene.add(this.tetrahedron);
        
        // Create colored vertices
        this.createVertexSpheres();
        
        // Add wireframe for better visualization
        const wireframe = new THREE.WireframeGeometry(geometry);
        const line = new THREE.LineSegments(wireframe);
        line.material.color.set(0x888888);
        line.material.transparent = true;
        line.material.opacity = 0.3;
        this.tetrahedron.add(line);
    }
    
    createVertexSpheres() {
        const sphereGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const vertices = [
            { pos: [2.5, 2.5, 2.5], color: 0xFF6B6B, id: 'ψ₁' },
            { pos: [2.5, -2.5, -2.5], color: 0x4ECDC4, id: 'ψ₂' },
            { pos: [-2.5, 2.5, -2.5], color: 0x45B7D1, id: 'ψ₃' },
            { pos: [-2.5, -2.5, 2.5], color: 0xFFE66D, id: 'ψ₄' }
        ];
        
        vertices.forEach(vertex => {
            const material = new THREE.MeshPhongMaterial({ 
                color: vertex.color,
                emissive: vertex.color,
                emissiveIntensity: 0.3
            });
            
            const sphere = new THREE.Mesh(sphereGeometry, material);
            sphere.position.set(...vertex.pos);
            sphere.userData = { id: vertex.id };
            
            // Make spheres interactive
            sphere.cursor = 'pointer';
            
            this.vertexSpheres.push(sphere);
            this.scene.add(sphere);
        });
    }
    
    selectVertex(vertexId) {
        this.selectedVertex = vertexId;
        
        // Update UI
        document.querySelectorAll('.vertex').forEach(el => {
            el.classList.toggle('selected', el.textContent.includes(vertexId));
        });
        
        document.getElementById('current-vertex').textContent = vertexId;
        
        // Visual feedback
        this.highlightVertex(vertexId);
    }
    
    highlightVertex(vertexId) {
        this.vertexSpheres.forEach(sphere => {
            const isSelected = sphere.userData.id === vertexId;
            sphere.material.emissiveIntensity = isSelected ? 0.8 : 0.3;
            sphere.scale.setScalar(isSelected ? 1.4 : 1.0);
        });
    }
    
    updateCoordinates() {
        const position = this.controls.target;
        const rotation = this.tetrahedron.rotation;
        
        document.getElementById('pos-x').textContent = position.x.toFixed(2);
        document.getElementById('pos-y').textContent = position.y.toFixed(2);
        document.getElementById('pos-z').textContent = position.z.toFixed(2);
        
        document.getElementById('rot-x').textContent = (rotation.x * 180 / Math.PI).toFixed(1) + '°';
        document.getElementById('rot-y').textContent = (rotation.y * 180 / Math.PI).toFixed(1) + '°';
        document.getElementById('rot-z').textContent = (rotation.z * 180 / Math.PI).toFixed(1) + '°';
        
        requestAnimationFrame(() => this.updateCoordinates());
    }
    
    async loadWASM() {
        try {
            this.rothModule = await loadRoTHWASM();
            this.isWasmLoaded = true;
            console.log('✅ RoTH WASM loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load RoTH WASM:', error);
            this.isWasmLoaded = false;
        }
    }
    
    async generateSeed() {
        const passphrase = document.getElementById('passphrase').value.trim();
        
        if (!passphrase) {
            this.showMessage('⚠️ Vennligst skriv inn en passfrase', 'warning');
            return;
        }
        
        if (!this.isWasmLoaded) {
            this.showMessage('🔄 RoTH HASHer lastes fortsatt...', 'info');
            return;
        }
        
        try {
            // Prepare input data
            const position = this.controls.target;
            const rotation = this.tetrahedron.rotation;
            
            const inputData = {
                position: [position.x, position.y, position.z],
                rotation: [rotation.x, rotation.y, rotation.z],
                vertex: this.selectedVertex,
                passphrase: passphrase
            };
            
            // Convert to bytes for hashing
            const inputBytes = this.prepareInputBytes(inputData);
            
            // Generate hash
            const seed = await this.rothModule.roth_hash(inputBytes);
            
            // Display result
            this.displaySeed(seed, inputData);
            
        } catch (error) {
            console.error('Seed generation failed:', error);
            this.showMessage('❌ Feil under seed-generering', 'error');
        }
    }
    
    prepareInputBytes(data) {
        // Convert all data to a single byte array
        const encoder = new TextEncoder();
        
        // Position (3 floats = 12 bytes)
        const posBuffer = new Float32Array(data.position);
        
        // Rotation (3 floats = 12 bytes)  
        const rotBuffer = new Float32Array(data.rotation);
        
        // Vertex ID (1 byte)
        const vertexByte = this.vertexToByte(data.vertex);
        
        // Passphrase (variable length)
        const passBytes = encoder.encode(data.passphrase);
        
        // Combine all
        const totalLength = posBuffer.byteLength + rotBuffer.byteLength + 1 + passBytes.length;
        const combined = new Uint8Array(totalLength);
        
        let offset = 0;
        combined.set(new Uint8Array(posBuffer.buffer), offset);
        offset += posBuffer.byteLength;
        
        combined.set(new Uint8Array(rotBuffer.buffer), offset);
        offset += rotBuffer.byteLength;
        
        combined.set([vertexByte], offset);
        offset += 1;
        
        combined.set(passBytes, offset);
        
        return combined;
    }
    
    vertexToByte(vertexId) {
        const mapping = { 'ψ₁': 0x10, 'ψ₂': 0x20, 'ψ₃': 0x30, 'ψ₄': 0x40 };
        return mapping[vertexId] || 0x10;
    }
    
    displaySeed(seedBytes, inputData) {
        const seedHex = Array.from(seedBytes).map(b => 
            b.toString(16).padStart(2, '0')
        ).join('');
        
        const seedB64 = btoa(String.fromCharCode(...seedBytes));
        
        const output = document.getElementById('seed-output');
        output.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>🎉 Seed Generert!</strong>
            </div>
            <div style="font-size: 10px; opacity: 0.8; margin-bottom: 10px;">
                Posisjon: ${inputData.position.map(p => p.toFixed(2)).join(', ')}<br>
                Rotasjon: ${inputData.rotation.map(r => (r * 180/Math.PI).toFixed(1) + '°').join(', ')}<br>
                Hjørne: ${inputData.vertex}<br>
                Passfrase: ${inputData.passphrase}
            </div>
            <strong>Hex:</strong><br>
            <code style="font-size: 9px;">${seedHex}</code><br><br>
            <strong>Base64:</strong><br>
            <code style="font-size: 9px;">${seedB64}</code>
        `;
        
        this.showMessage('✅ Seed generert suksessfullt!', 'success');
    }
    
    showMessage(message, type) {
        // Simple message display
        const colors = {
            success: '#4CAF50',
            error: '#F44336', 
            warning: '#FF9800',
            info: '#2196F3'
        };
        
        const output = document.getElementById('seed-output');
        if (type !== 'success') {
            output.innerHTML = `<div style="color: ${colors[type]}">${message}</div>`;
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
