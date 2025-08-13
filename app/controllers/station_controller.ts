import Station from '#models/station'
import { HttpContext } from '@adonisjs/core/http'
import UserQrCode from '#models/user_qr_code' 
import { randomBytes } from 'crypto'

export default class StationsController {
    public async getAllStations({ response }: HttpContext) {
    const stations = await Station.all()

    return response.ok({
        status: 'success',
        data: stations,
        msg: 'Lista de todas las estaciones obtenida correctamente',
    })
    }

    public async deleteStationByToken({ request, response }: HttpContext) {
    const { stationToken } = request.only(['stationToken'])

    if (!stationToken) {
        return response.badRequest({
        status: 'error',
        msg: 'stationToken es requerido',
        })
    }

    const station = await Station.findBy('stationToken', stationToken)

    if (!station) {
        return response.notFound({
        status: 'error',
        msg: 'Estación no encontrada',
        })
    }

    await station.softDelete()

    return response.ok({
        status: 'success',
        msg: 'Estación eliminada correctamente',
    })
    }

  // 1 - Asignar usuario a estación (Guardar ID en la estación)
  public async assignUserToStation({ request, response }: HttpContext) {
    const { stationToken, userId } = request.only(['stationToken', 'userId'])

    if (!stationToken || !userId) {
      return response.badRequest({
        status: 'error',
        msg: 'stationToken y userId son requeridos',
      })
    }

    const station = await Station.findBy('stationToken', stationToken)

    if (!station) {
      return response.notFound({
        status: 'error',
        msg: 'Estación no encontrada',
      })
    }

    station.userIn = userId
    station.status = 'standby'
    await station.save()

    return response.ok({
      status: 'success',
      data: { stationId: station.id, userIn: station.userIn, status: station.status },
      msg: 'Usuario asignado a estación correctamente',
    })
  }

    // 2 - Obtener detalles de estación (por stationToken)
    public async getStationDetails({ request, response }: HttpContext) {
        const { stationToken } = request.only(['stationToken'])

        if (!stationToken) {
        return response.badRequest({
            status: 'error',
            msg: 'stationToken es requerido',
        })
        }

        const station = await Station.findBy('stationToken', stationToken)

        if (!station) {
        return response.notFound({
            status: 'error',
            msg: 'Estación no encontrada',
        })
        }

        return response.ok({
        status: 'success',
        data: {
            id: station.id,
            stationId: station.stationId,
            type: station.type,
            location: station.location,
            firmwareVersion: station.firmwareVersion,
            status: station.status,
            userIn: station.userIn,
            lastPing: station.lastPing?.toISO(),
            hardwareId: station.hardwareId,
        },
        msg: 'Detalles de estación obtenidos correctamente',
        })
    }

    // 4 - Ruta para obtener estaciones en standby
    public async getStationsInStandby({ response }: HttpContext) {
    const stations = await Station.query().where('status', 'standby')

    return response.ok({
        status: 'success',
        data: stations,
        msg: 'Estaciones en estado standby obtenidas correctamente',
    })
    }

    // 5 - Obtener ID del usuario en estación standby
    public async getUserInStandby({ request, response }: HttpContext) {
    const { stationToken } = request.only(['stationToken'])

    if (!stationToken) {
        return response.badRequest({
        status: 'error',
        msg: 'stationToken es requerido',
        })
    }

    const station = await Station.findBy('stationToken', stationToken)

    if (!station) {
        return response.notFound({
        status: 'error',
        msg: 'Estación no encontrada',
        })
    }

    if (station.status !== 'standby' || !station.userIn) {
        return response.ok({
        status: 'success',
        data: null,
        msg: 'La estación no está en estado standby o no tiene usuario asignado',
        })
    }

    return response.ok({
        status: 'success',
        data: { userId: station.userIn },
        msg: 'ID del usuario en estación standby obtenida correctamente',
    })
    }

    // 6 - Liberar estación de standby (confirma usuario, libera estación)
    public async releaseStationStandby({ request, response }: HttpContext) {
    const { stationToken, stationAccess } = request.only(['stationToken', 'stationAccess'])

    let accessBool;
    if (typeof stationAccess === 'boolean') {
    accessBool = stationAccess;
    } else {
    accessBool = String(stationAccess).toLowerCase() === 'true';
    }
    
    if (!stationToken || stationAccess === undefined) {
        return response.badRequest({ status: 'error', msg: 'stationToken y stationAccess son requeridos' })
    }

    const station = await Station.findBy('stationToken', stationToken)

    if (!station) {
        return response.notFound({ status: 'error', msg: 'Estación no encontrada' })
    }

    if (station.status !== 'standby' || !station.userIn) {
        return response.badRequest({ status: 'error', msg: 'La estación no está en standby o no tiene usuario asignado' })
    }

    if (!accessBool) {
        station.userIn = null
        station.status = 'online'
        station.lastActionStatus = 'denied' 
        await station.save()

        return response.status(403).json({
        status: 'denied',
        msg: 'Acceso denegado por trabajador, estación liberada',
        data: { stationId: station.id, status: station.status, userIn: station.userIn },
        })
    }

    // Buscar QR asociado al usuario
    const qrRecord = await UserQrCode.findBy('userId', station.userIn)

    if (!qrRecord) {
        console.warn(`[WARN] Usuario ${station.userIn} no tiene QR asociado para modificar`)
    } else {
        // Ajustar comportamiento según tipo de estación
        if (station.type === 'entrada') {
        // En estación de entrada solo dejamos el estado ENTRADA_OK
        if (qrRecord.status !== 'ENTRADA_OK' && qrRecord.status !== 'SALIDA_OK' ) {
            qrRecord.status = 'ENTRADA_OK'
            await qrRecord.save()
        }
        } else if (station.type === 'salida') {
        // En estación de salida, marcar SALIDA_OK y eliminar QR
        if(qrRecord.status !== 'SALIDA_OK' && qrRecord.status !== 'GENERADO'){
            qrRecord.status = 'SALIDA_OK'
            await qrRecord.save()
            await qrRecord.delete()
        }
        } else {
        return response.badRequest({
            status: 'error',
            msg: `Tipo de estación desconocido: ${station.type}`,
        })
        }
    }

    station.userIn = null
    station.status = 'online'
    station.lastActionStatus = 'granted'
    await station.save()

    return response.ok({
        status: 'success',
        msg: 'Estación liberada correctamente, QR actualizado según tipo de estación',
        data: { stationId: station.id, status: station.status, userIn: station.userIn },
    })
    }

    // 9 - Obtener configuraciones necesarias para nueva estación
    public async getStationConfigurations({ response }: HttpContext) {
    // Generar stationId como un entero con formato YYYYMMDD
    const randomStationId = Math.floor(Math.random() * 9e14 + 1e14).toString()

    const configurations = {
        stationId: randomStationId,
        hardwareId: '00:1A:2B:3C:4D:5E',
        firmwareVersion: '1.1.0',
        supportedTypes: ['entrada', 'salida'],
        allowedStatuses: ['online', 'offline', 'standby'],
    }

    return response.ok({
        status: 'success',
        data: configurations,
        msg: 'Configuraciones para nueva estación obtenidas correctamente',
    })
    }

    // 10 - Guardar nueva estación internamente
    public async createStation({ request, response }: HttpContext) {
        const {
        hardware_id,
        type,
        location,
        firmware_version,
        status,
        } = request.only([
        'hardware_id',
        'type',
        'location',
        'firmware_version',
        'status',
        ])

        // Validaciones básicas
        if (!hardware_id || !type) {
        return response.badRequest({
            status: 'error',
            msg: 'hardware_id y type son requeridos',
        })
        }

        if (!['entrada', 'salida'].includes(type)) {
        return response.badRequest({
            status: 'error',
            msg: 'El tipo de estación debe ser "entrada" o "salida"',
        })
        }

        const loc = location ?? 'Default Location'
        const fwVersion = firmware_version ?? '1.0.0'
        const stat = status ?? 'offline'
        const userIn = null

        // Generar stationId como número random de 15 dígitos (string)
        const generateStationId = () => {
        let id = ''
        while (id.length < 15) {
            id += Math.floor(Math.random() * 10).toString()
        }
        return id
        }
        const stationId = generateStationId()

        // Generar token único para la estación
        let stationToken = randomBytes(16).toString('hex')
        while (await Station.findBy('stationToken', stationToken)) {
        stationToken = randomBytes(16).toString('hex')
        }

        const station = new Station()
        station.stationId = stationId
        station.stationToken = stationToken
        station.type = type
        station.location = loc
        station.firmwareVersion = fwVersion
        station.status = stat
        station.userIn = userIn
        station.hardwareId = hardware_id

        await station.save()

        return response.created({
        status: 'success',
        data: { stationToken, stationId },
        msg: 'Nueva estación creada correctamente',
        })
    }

    // Editar estación existente
    public async updateStation({ request, response }: HttpContext) {
        const { stationToken } = request.only(['stationToken'])
        const {
            type,
            location,
            firmware_version,
            status,
            hardware_id,
        } = request.only([
            'type',
            'location',
            'firmware_version',
            'status',
            'hardware_id',
        ])

        if (!stationToken) {
            return response.badRequest({
                status: 'error',
                msg: 'stationToken es requerido',
            })
        }

        const station = await Station.findBy('stationToken', stationToken)

        if (!station) {
            return response.notFound({
                status: 'error',
                msg: 'Estación no encontrada',
            })
        }

        // Validar tipo si se proporciona
        if (type && !['entrada', 'salida'].includes(type)) {
            return response.badRequest({
                status: 'error',
                msg: 'El tipo de estación debe ser "entrada" o "salida"',
            })
        }

        // Validar status si se proporciona
        if (status && !['online', 'offline', 'standby'].includes(status)) {
            return response.badRequest({
                status: 'error',
                msg: 'El status debe ser "online", "offline" o "standby"',
            })
        }

        // Actualizar solo los campos proporcionados
        if (type !== undefined) station.type = type
        if (location !== undefined) station.location = location
        if (firmware_version !== undefined) station.firmwareVersion = firmware_version
        if (status !== undefined) station.status = status
        if (hardware_id !== undefined) station.hardwareId = hardware_id

        await station.save()

        return response.ok({
            status: 'success',
            data: {
                id: station.id,
                stationId: station.stationId,
                stationToken: station.stationToken,
                type: station.type,
                location: station.location,
                firmwareVersion: station.firmwareVersion,
                status: station.status,
                userIn: station.userIn,
                hardwareId: station.hardwareId,
            },
            msg: 'Estación actualizada correctamente',
        })
    }

      // 11 - Verificar estado de estación por stationToken
    public async checkStationStatus({ request, response }: HttpContext) {
    const { stationToken } = request.only(['stationToken'])

    if (!stationToken) {
        return response.badRequest({
        status: 'error',
        msg: 'stationToken es requerido',
        })
    }

    const station = await Station.findBy('stationToken', stationToken)

    if (!station) {
        return response.notFound({
        status: 'error',
        msg: 'Estación no encontrada',
        })
    }

    return response.ok({
        status: 'success',
        data: {
        id: station.id,
        stationId: station.stationId,
        type: station.type,
        location: station.location,
        firmwareVersion: station.firmwareVersion,
        status: station.status,
        userIn: station.userIn,
        lastActionStatus: station.lastActionStatus,  
        lastPing: station.lastPing?.toISO(),
        hardwareId: station.hardwareId,
        },
        msg: 'Estado de estación obtenido correctamente',
    })
    }
    
    // 12 - Obtener código de Arduino para nueva estación
    public async getArduinoCode({ response }: HttpContext) {
        const arduinoCodeLines = [
            "void setup() {",
            "  Serial.begin(9600); // Inicializa comunicación serie",
            "  pinMode(12, OUTPUT); // LED verde",
            "  pinMode(11, OUTPUT); // LED amarillo", 
            "  pinMode(10, OUTPUT); // LED rojo",
            "  ",
            "  // Establecer estado inicial: solo LED rojo encendido",
            "  digitalWrite(12, LOW);  // Verde OFF",
            "  digitalWrite(11, LOW);  // Amarillo OFF", 
            "  digitalWrite(10, HIGH); // Rojo ON (estado por defecto)",
            "  ",
            "  // Limpiar buffer de entrada",
            "  while(Serial.available() > 0) {",
            "    Serial.read();",
            "  }",
            "  ",
            "  // Enviar respuesta de confirmación (opcional)",
            "  Serial.println(\"READY\");",
            "}",
            "",
            "void loop() {",
            "  if (Serial.available() >= 2) { // Espera 2 caracteres: letra + estado",
            "    char led = Serial.read();   // G, A o R", 
            "    char estado = Serial.read(); // 1 = ON, 0 = OFF",
            "    ",
            "    // Limpiar cualquier carácter extra (como \\n)",
            "    while(Serial.available() > 0) {",
            "      Serial.read();",
            "    }",
            "",
            "    if (led == 'G' || led == 'g') {",
            "      digitalWrite(12, estado == '1' ? HIGH : LOW);",
            "    }",
            "    else if (led == 'A' || led == 'a') {",
            "      digitalWrite(11, estado == '1' ? HIGH : LOW);",
            "    }",
            "    else if (led == 'R' || led == 'r') {",
            "      digitalWrite(10, estado == '1' ? HIGH : LOW);",
            "    }",
            "    ",
            "    // Opcional: enviar confirmación de que el comando fue recibido",
            "    Serial.print(\"OK:\");",
            "    Serial.print(led);",
            "    Serial.println(estado);",
            "  }",
            "}"
        ]
        
        return response.ok({
            status: 'success',
            data: {
                arduinoCode: arduinoCodeLines,
                description: 'Código base para Arduino con control de LEDs RGB',
                instructions: {
                    commands: {
                        'G1': 'Encender LED verde',
                        'G0': 'Apagar LED verde',
                        'A1': 'Encender LED amarillo',
                        'A0': 'Apagar LED amarillo',
                        'R1': 'Encender LED rojo',
                        'R0': 'Apagar LED rojo'
                    },
                    pins: {
                        green: 12,
                        yellow: 11,
                        red: 10
                    }
                }
            },
            msg: 'Código de Arduino obtenido correctamente'
        })
    }
    
}

