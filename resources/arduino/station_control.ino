void setup() {
  Serial.begin(9600); // Inicializa comunicación serie
  pinMode(12, OUTPUT); // LED verde
  pinMode(11, OUTPUT); // LED amarillo
  pinMode(10, OUTPUT); // LED rojo
  
  // Establecer estado inicial: solo LED rojo encendido
  digitalWrite(12, LOW);  // Verde OFF
  digitalWrite(11, LOW);  // Amarillo OFF
  digitalWrite(10, HIGH); // Rojo ON (estado por defecto)
  
  // Limpiar buffer de entrada
  while(Serial.available() > 0) {
    Serial.read();
  }
  
  // Enviar respuesta de confirmación (opcional)
  Serial.println("READY");
}

void loop() {
  if (Serial.available() >= 2) { // Espera 2 caracteres: letra + estado
    char led = Serial.read();   // G, A o R
    char estado = Serial.read(); // 1 = ON, 0 = OFF
    
    // Limpiar cualquier carácter extra (como \n)
    while(Serial.available() > 0) {
      Serial.read();
    }

    if (led == 'G' || led == 'g') {
      digitalWrite(12, estado == '1' ? HIGH : LOW);
    }
    else if (led == 'A' || led == 'a') {
      digitalWrite(11, estado == '1' ? HIGH : LOW);
    }
    else if (led == 'R' || led == 'r') {
      digitalWrite(10, estado == '1' ? HIGH : LOW);
    }
    
    // Opcional: enviar confirmación de que el comando fue recibido
    Serial.print("OK:");
    Serial.print(led);
    Serial.println(estado);
  }
}
