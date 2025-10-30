/*
  # Seed Global Security Catalog (Physical Security Focus)

  ## Purpose
  Pre-populate asset_catalog and threat_catalog with common items for
  physical security risk analysis across different industries.

  ## Categories

  ### Assets (4 categories):
  - Personas (People)
  - Bienes (Property/Assets)
  - Procesos (Processes)
  - Información (Information - Physical)

  ### Threats (3 categories):
  - Naturales (Natural)
  - Tecnológicas (Technological)
  - Sociales (Social/Human)

  ## Industries Covered:
  - manufacturing (Manufactura)
  - logistics (Logística/Almacenes)
  - retail (Comercio/Retail)
  - office (Oficinas)
  - banking (Bancos)
  - healthcare (Hospitales)
  - education (Escuelas)

  ## Note:
  Replace 'SUPER_ADMIN_USER_ID' with actual super_admin user ID before running
*/

-- =============================================
-- STEP 1: Get or create super_admin user ID
-- =============================================

DO $$
DECLARE
  super_admin_id uuid;
BEGIN
  -- Try to find existing super_admin
  SELECT id INTO super_admin_id
  FROM users
  WHERE role = 'super_admin'
  LIMIT 1;

  -- If no super_admin found, use a placeholder (will need manual fix)
  IF super_admin_id IS NULL THEN
    RAISE NOTICE 'No super_admin user found. Creating placeholder entries.';
    super_admin_id := '00000000-0000-0000-0000-000000000001'::uuid;
  END IF;

  -- Store in temp table for use in inserts
  CREATE TEMP TABLE IF NOT EXISTS temp_admin (id uuid);
  DELETE FROM temp_admin;
  INSERT INTO temp_admin VALUES (super_admin_id);
END $$;

-- =============================================
-- ACTIVOS: PERSONAS (People)
-- =============================================

INSERT INTO asset_catalog (
  name, description, category, is_global,
  industry_types, location_types, priority, tags, created_by
) VALUES
  (
    'Personal operativo',
    'Empleados que realizan operaciones diarias',
    'Personas',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'healthcare'],
    ARRAY['plant', 'warehouse', 'office'],
    'high',
    ARRAY['personal', 'empleados', 'operaciones'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Personal administrativo',
    'Empleados de áreas administrativas y de soporte',
    'Personas',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office'],
    'medium',
    ARRAY['personal', 'empleados', 'oficina'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Directivos y ejecutivos',
    'Personal de alta dirección y toma de decisiones',
    'Personas',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office'],
    'critical',
    ARRAY['personal', 'ejecutivos', 'liderazgo'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Personal de seguridad',
    'Guardias y personal de vigilancia',
    'Personas',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office', 'plant', 'warehouse'],
    'high',
    ARRAY['personal', 'seguridad', 'vigilancia'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Visitantes y clientes',
    'Personas externas que ingresan a las instalaciones',
    'Personas',
    true,
    ARRAY['retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office', 'warehouse'],
    'medium',
    ARRAY['visitantes', 'clientes', 'externos'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Contratistas y proveedores',
    'Personal externo temporal que realiza trabajos específicos',
    'Personas',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'banking', 'healthcare'],
    ARRAY['office', 'plant', 'warehouse'],
    'medium',
    ARRAY['contratistas', 'proveedores', 'externos'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Personal médico',
    'Doctores, enfermeras y personal de salud',
    'Personas',
    true,
    ARRAY['healthcare'],
    ARRAY['office'],
    'critical',
    ARRAY['personal', 'medicos', 'salud'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Docentes y maestros',
    'Personal educativo y académico',
    'Personas',
    true,
    ARRAY['education'],
    ARRAY['office'],
    'high',
    ARRAY['personal', 'docentes', 'educacion'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Estudiantes',
    'Alumnos y estudiantes',
    'Personas',
    true,
    ARRAY['education'],
    ARRAY['office'],
    'high',
    ARRAY['estudiantes', 'alumnos'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Personal de limpieza y mantenimiento',
    'Trabajadores de servicios generales',
    'Personas',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office', 'plant', 'warehouse'],
    'medium',
    ARRAY['personal', 'limpieza', 'mantenimiento'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Cajeros y personal de atención',
    'Personal que maneja efectivo y atiende clientes',
    'Personas',
    true,
    ARRAY['retail', 'banking'],
    ARRAY['office'],
    'high',
    ARRAY['personal', 'cajeros', 'atencion'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Choferes y operadores de transporte',
    'Personal que maneja vehículos y realiza entregas',
    'Personas',
    true,
    ARRAY['logistics', 'retail'],
    ARRAY['transit'],
    'high',
    ARRAY['personal', 'choferes', 'transporte'],
    (SELECT id FROM temp_admin)
  );

-- =============================================
-- ACTIVOS: BIENES (Property/Assets)
-- =============================================

INSERT INTO asset_catalog (
  name, description, category, is_global,
  industry_types, location_types, priority, tags, created_by
) VALUES
  (
    'Edificio e instalaciones',
    'Estructura física principal y áreas construidas',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office', 'plant', 'warehouse'],
    'critical',
    ARRAY['infraestructura', 'edificio', 'instalaciones'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Maquinaria y equipo de producción',
    'Equipos para procesos de manufactura',
    'Bienes',
    true,
    ARRAY['manufacturing'],
    ARRAY['plant'],
    'critical',
    ARRAY['maquinaria', 'produccion', 'equipo'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Equipos de cómputo',
    'Computadoras, laptops y dispositivos informáticos',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office', 'plant', 'warehouse'],
    'high',
    ARRAY['tecnologia', 'computadoras', 'it'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Servidores y equipos de red',
    'Infraestructura tecnológica de comunicaciones',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office'],
    'critical',
    ARRAY['tecnologia', 'servidores', 'it', 'red'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Vehículos de transporte',
    'Camiones, autos y vehículos de reparto',
    'Bienes',
    true,
    ARRAY['logistics', 'retail'],
    ARRAY['transit', 'warehouse'],
    'high',
    ARRAY['vehiculos', 'transporte', 'logistica'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Montacargas y equipo de manejo',
    'Equipos para movimiento de materiales',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics'],
    ARRAY['plant', 'warehouse'],
    'high',
    ARRAY['montacargas', 'manejo', 'equipo'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Inventario y mercancía',
    'Productos almacenados y en proceso',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics', 'retail'],
    ARRAY['warehouse', 'office'],
    'critical',
    ARRAY['inventario', 'mercancia', 'productos'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Mobiliario y equipo de oficina',
    'Muebles, escritorios, sillas',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office'],
    'low',
    ARRAY['mobiliario', 'muebles', 'oficina'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Sistemas de seguridad física',
    'Cámaras, alarmas, control de acceso',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office', 'plant', 'warehouse'],
    'high',
    ARRAY['seguridad', 'camaras', 'alarmas'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Sistemas contra incendio',
    'Extintores, rociadores, detectores de humo',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office', 'plant', 'warehouse'],
    'critical',
    ARRAY['seguridad', 'incendios', 'proteccion'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Herramientas y equipo menor',
    'Herramientas de trabajo y equipo portátil',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics'],
    ARRAY['plant', 'warehouse'],
    'medium',
    ARRAY['herramientas', 'equipo', 'trabajo'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Efectivo y valores',
    'Dinero en efectivo, cheques y valores',
    'Bienes',
    true,
    ARRAY['retail', 'banking'],
    ARRAY['office'],
    'critical',
    ARRAY['efectivo', 'dinero', 'valores'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Equipo médico',
    'Equipos y dispositivos médicos especializados',
    'Bienes',
    true,
    ARRAY['healthcare'],
    ARRAY['office'],
    'critical',
    ARRAY['medico', 'equipos', 'salud'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Medicamentos y suministros médicos',
    'Fármacos y material médico',
    'Bienes',
    true,
    ARRAY['healthcare'],
    ARRAY['office'],
    'critical',
    ARRAY['medicamentos', 'suministros', 'farmacia'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Material educativo y equipo',
    'Libros, equipo de laboratorio, material didáctico',
    'Bienes',
    true,
    ARRAY['education'],
    ARRAY['office'],
    'medium',
    ARRAY['educativo', 'material', 'libros'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Cercas y bardas perimetrales',
    'Protección perimetral de las instalaciones',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'banking'],
    ARRAY['office', 'plant', 'warehouse'],
    'high',
    ARRAY['perimetral', 'cercas', 'seguridad'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Sistemas eléctricos y generadores',
    'Infraestructura eléctrica y respaldo de energía',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'banking', 'healthcare'],
    ARRAY['office', 'plant', 'warehouse'],
    'critical',
    ARRAY['electrico', 'energia', 'planta'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Sistemas de climatización',
    'Aires acondicionados, calefacción, ventilación',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'banking', 'healthcare'],
    ARRAY['office', 'plant', 'warehouse'],
    'medium',
    ARRAY['climatizacion', 'hvac', 'aire'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Materias primas',
    'Insumos para procesos productivos',
    'Bienes',
    true,
    ARRAY['manufacturing'],
    ARRAY['plant', 'warehouse'],
    'high',
    ARRAY['materias', 'insumos', 'produccion'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Productos terminados',
    'Mercancía lista para venta o distribución',
    'Bienes',
    true,
    ARRAY['manufacturing', 'logistics', 'retail'],
    ARRAY['warehouse', 'office'],
    'critical',
    ARRAY['productos', 'terminados', 'mercancia'],
    (SELECT id FROM temp_admin)
  );

-- =============================================
-- ACTIVOS: PROCESOS (Processes)
-- =============================================

INSERT INTO asset_catalog (
  name, description, category, is_global,
  industry_types, location_types, priority, tags, created_by
) VALUES
  (
    'Proceso de producción',
    'Operación continua de manufactura',
    'Procesos',
    true,
    ARRAY['manufacturing'],
    ARRAY['plant'],
    'critical',
    ARRAY['produccion', 'manufactura', 'operaciones'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Cadena de suministro',
    'Flujo de abastecimiento y distribución',
    'Procesos',
    true,
    ARRAY['manufacturing', 'logistics', 'retail'],
    ARRAY['warehouse', 'transit'],
    'critical',
    ARRAY['suministro', 'logistica', 'distribucion'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Operaciones de almacenamiento',
    'Procesos de recepción, almacenaje y despacho',
    'Procesos',
    true,
    ARRAY['logistics', 'retail'],
    ARRAY['warehouse'],
    'high',
    ARRAY['almacen', 'logistica', 'operaciones'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Atención al cliente',
    'Procesos de servicio y atención',
    'Procesos',
    true,
    ARRAY['retail', 'banking', 'healthcare'],
    ARRAY['office'],
    'high',
    ARRAY['atencion', 'clientes', 'servicio'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Operaciones financieras',
    'Transacciones y manejo de recursos financieros',
    'Procesos',
    true,
    ARRAY['banking', 'retail'],
    ARRAY['office'],
    'critical',
    ARRAY['financiero', 'transacciones', 'dinero'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Servicios de salud',
    'Atención médica y procedimientos clínicos',
    'Procesos',
    true,
    ARRAY['healthcare'],
    ARRAY['office'],
    'critical',
    ARRAY['salud', 'medico', 'atencion'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Procesos educativos',
    'Actividades de enseñanza y aprendizaje',
    'Procesos',
    true,
    ARRAY['education'],
    ARRAY['office'],
    'high',
    ARRAY['educacion', 'ensenanza', 'academico'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Servicios de agua y drenaje',
    'Suministro de agua y saneamiento',
    'Procesos',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'healthcare', 'education'],
    ARRAY['office', 'plant', 'warehouse'],
    'high',
    ARRAY['agua', 'servicios', 'infraestructura'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Control de acceso y vigilancia',
    'Procesos de seguridad y monitoreo',
    'Procesos',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'banking', 'healthcare'],
    ARRAY['office', 'plant', 'warehouse'],
    'high',
    ARRAY['seguridad', 'acceso', 'vigilancia'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Mantenimiento de instalaciones',
    'Conservación y reparación de infraestructura',
    'Procesos',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office', 'plant', 'warehouse'],
    'medium',
    ARRAY['mantenimiento', 'conservacion', 'reparacion'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Transporte de mercancías',
    'Traslado de productos y materiales',
    'Procesos',
    true,
    ARRAY['logistics', 'retail', 'manufacturing'],
    ARRAY['transit', 'warehouse'],
    'high',
    ARRAY['transporte', 'logistica', 'distribucion'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Comunicaciones internas',
    'Sistemas de comunicación organizacional',
    'Procesos',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office', 'plant'],
    'medium',
    ARRAY['comunicacion', 'telefonia', 'sistemas'],
    (SELECT id FROM temp_admin)
  );

-- =============================================
-- ACTIVOS: INFORMACIÓN (Information - Physical)
-- =============================================

INSERT INTO asset_catalog (
  name, description, category, is_global,
  industry_types, location_types, priority, tags, created_by
) VALUES
  (
    'Documentos confidenciales',
    'Contratos, acuerdos, documentación sensible',
    'Información',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office'],
    'high',
    ARRAY['documentos', 'confidencial', 'papel'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Archivos contables y financieros',
    'Registros financieros y contables físicos',
    'Información',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking'],
    ARRAY['office'],
    'critical',
    ARRAY['financiero', 'contabilidad', 'archivos'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Expedientes de personal',
    'Información de recursos humanos',
    'Información',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office'],
    'high',
    ARRAY['personal', 'rrhh', 'expedientes'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Planos y diseños',
    'Documentación técnica y de ingeniería',
    'Información',
    true,
    ARRAY['manufacturing', 'office'],
    ARRAY['office', 'plant'],
    'high',
    ARRAY['planos', 'disenos', 'tecnico'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Historiales médicos',
    'Expedientes clínicos de pacientes',
    'Información',
    true,
    ARRAY['healthcare'],
    ARRAY['office'],
    'critical',
    ARRAY['medico', 'expedientes', 'pacientes'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Registros académicos',
    'Expedientes y calificaciones de estudiantes',
    'Información',
    true,
    ARRAY['education'],
    ARRAY['office'],
    'high',
    ARRAY['academico', 'expedientes', 'estudiantes'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Medios de almacenamiento físico',
    'USBs, discos duros externos, respaldos físicos',
    'Información',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['office'],
    'high',
    ARRAY['respaldos', 'almacenamiento', 'medios'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Bitácoras y registros operativos',
    'Logs y registros de actividades',
    'Información',
    true,
    ARRAY['manufacturing', 'logistics', 'healthcare'],
    ARRAY['office', 'plant', 'warehouse'],
    'medium',
    ARRAY['bitacoras', 'registros', 'operaciones'],
    (SELECT id FROM temp_admin)
  );

-- =============================================
-- AMENAZAS: NATURALES (Natural)
-- =============================================

INSERT INTO threat_catalog (
  name, description, category, is_global,
  industry_types, regions, severity, tags, created_by
) VALUES
  (
    'Sismos y terremotos',
    'Movimientos telúricos que pueden dañar instalaciones',
    'Naturales',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['mexico', 'latam'],
    'critical',
    ARRAY['sismo', 'terremoto', 'natural'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Inundaciones',
    'Entrada de agua por lluvia excesiva o desbordamiento',
    'Naturales',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['inundacion', 'lluvia', 'agua'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Huracanes y ciclones',
    'Fenómenos meteorológicos severos con vientos fuertes',
    'Naturales',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['mexico', 'latam'],
    'critical',
    ARRAY['huracan', 'ciclon', 'vientos'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Tormentas eléctricas',
    'Descargas eléctricas atmosféricas (rayos)',
    'Naturales',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'banking', 'healthcare'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['tormenta', 'rayos', 'electrica'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Temperaturas extremas',
    'Calor o frío excesivo que afecta operaciones',
    'Naturales',
    true,
    ARRAY['manufacturing', 'logistics', 'healthcare'],
    ARRAY['mexico', 'latam'],
    'medium',
    ARRAY['temperatura', 'calor', 'frio'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Deslaves y deslizamientos',
    'Movimiento de tierra en zonas montañosas',
    'Naturales',
    true,
    ARRAY['manufacturing', 'logistics', 'office'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['deslave', 'tierra', 'montana'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Incendios forestales',
    'Fuego en áreas verdes cercanas',
    'Naturales',
    true,
    ARRAY['manufacturing', 'logistics', 'office'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['incendio', 'forestal', 'fuego'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Granizadas',
    'Caída de granizo que puede dañar estructura y vehículos',
    'Naturales',
    true,
    ARRAY['manufacturing', 'logistics', 'retail'],
    ARRAY['mexico', 'latam'],
    'medium',
    ARRAY['granizo', 'clima', 'dano'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Vientos fuertes',
    'Ráfagas de viento que pueden causar daños',
    'Naturales',
    true,
    ARRAY['manufacturing', 'logistics', 'retail'],
    ARRAY['mexico', 'latam'],
    'medium',
    ARRAY['viento', 'rafaga', 'clima'],
    (SELECT id FROM temp_admin)
  );

-- =============================================
-- AMENAZAS: TECNOLÓGICAS (Technological)
-- =============================================

INSERT INTO threat_catalog (
  name, description, category, is_global,
  industry_types, regions, severity, tags, created_by
) VALUES
  (
    'Incendio en instalaciones',
    'Fuego causado por fallas eléctricas, químicas o humanas',
    'Tecnológicas',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['mexico', 'latam'],
    'critical',
    ARRAY['incendio', 'fuego', 'emergencia'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Explosión',
    'Detonación por gases, químicos o materiales peligrosos',
    'Tecnológicas',
    true,
    ARRAY['manufacturing', 'logistics'],
    ARRAY['mexico', 'latam'],
    'critical',
    ARRAY['explosion', 'detonacion', 'emergencia'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Falla eléctrica',
    'Corte de energía o sobrecarga eléctrica',
    'Tecnológicas',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['electrico', 'energia', 'falla'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Fuga de gas',
    'Escape de gas LP, natural u otros combustibles',
    'Tecnológicas',
    true,
    ARRAY['manufacturing', 'office', 'healthcare'],
    ARRAY['mexico', 'latam'],
    'critical',
    ARRAY['gas', 'fuga', 'emergencia'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Colapso estructural',
    'Falla en estructura de edificio o instalaciones',
    'Tecnológicas',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'education'],
    ARRAY['mexico', 'latam'],
    'critical',
    ARRAY['colapso', 'estructura', 'edificio'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Falla de sistemas de seguridad',
    'Mal funcionamiento de alarmas, cámaras o controles',
    'Tecnológicas',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'banking'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['seguridad', 'falla', 'sistemas'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Contaminación química',
    'Derrame o escape de sustancias peligrosas',
    'Tecnológicas',
    true,
    ARRAY['manufacturing', 'healthcare'],
    ARRAY['mexico', 'latam'],
    'critical',
    ARRAY['quimico', 'contaminacion', 'derrame'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Falla de maquinaria',
    'Avería de equipo crítico de producción',
    'Tecnológicas',
    true,
    ARRAY['manufacturing', 'logistics'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['maquinaria', 'falla', 'averia'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Falla de climatización',
    'Avería de sistemas de aire acondicionado o calefacción',
    'Tecnológicas',
    true,
    ARRAY['office', 'healthcare', 'banking'],
    ARRAY['mexico', 'latam'],
    'medium',
    ARRAY['climatizacion', 'hvac', 'falla'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Corto circuito',
    'Falla eléctrica que puede causar incendio',
    'Tecnológicas',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['electrico', 'corto', 'incendio'],
    (SELECT id FROM temp_admin)
  );

-- =============================================
-- AMENAZAS: SOCIALES (Social/Human)
-- =============================================

INSERT INTO threat_catalog (
  name, description, category, is_global,
  industry_types, regions, severity, tags, created_by
) VALUES
  (
    'Robo a mano armada',
    'Asalto con armas de fuego o blancas',
    'Sociales',
    true,
    ARRAY['retail', 'banking', 'logistics'],
    ARRAY['mexico', 'latam'],
    'critical',
    ARRAY['robo', 'asalto', 'violencia'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Robo hormiga',
    'Hurto menor y constante por personal interno',
    'Sociales',
    true,
    ARRAY['manufacturing', 'logistics', 'retail'],
    ARRAY['mexico', 'latam'],
    'medium',
    ARRAY['robo', 'hurto', 'interno'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Vandalismo',
    'Daño intencional a instalaciones o equipos',
    'Sociales',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'education'],
    ARRAY['mexico', 'latam'],
    'medium',
    ARRAY['vandalismo', 'dano', 'destruccion'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Sabotaje',
    'Daño intencional a operaciones o procesos',
    'Sociales',
    true,
    ARRAY['manufacturing', 'logistics'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['sabotaje', 'dano', 'intencional'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Secuestro o extorsión',
    'Privación de libertad o amenazas para obtener dinero',
    'Sociales',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'banking'],
    ARRAY['mexico', 'latam'],
    'critical',
    ARRAY['secuestro', 'extorsion', 'violencia'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Intrusión no autorizada',
    'Ingreso ilegal de personas a las instalaciones',
    'Sociales',
    true,
    ARRAY['manufacturing', 'logistics', 'office', 'banking', 'healthcare'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['intrusion', 'acceso', 'ilegal'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Manifestaciones y bloqueos',
    'Protestas que impiden operaciones normales',
    'Sociales',
    true,
    ARRAY['manufacturing', 'logistics', 'retail'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['manifestacion', 'bloqueo', 'protesta'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Violencia laboral',
    'Agresiones entre empleados o hacia personal',
    'Sociales',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office'],
    ARRAY['mexico', 'latam'],
    'medium',
    ARRAY['violencia', 'laboral', 'agresion'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Robo de vehículos',
    'Hurto de unidades de transporte',
    'Sociales',
    true,
    ARRAY['logistics', 'retail'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['robo', 'vehiculos', 'transporte'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Robo de carga en tránsito',
    'Asalto a unidades durante transporte',
    'Sociales',
    true,
    ARRAY['logistics'],
    ARRAY['mexico', 'latam'],
    'critical',
    ARRAY['robo', 'carga', 'transporte'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Fraude interno',
    'Actos fraudulentos por parte de empleados',
    'Sociales',
    true,
    ARRAY['retail', 'banking', 'office'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['fraude', 'interno', 'financiero'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Espionaje industrial',
    'Robo de información confidencial o secretos comerciales',
    'Sociales',
    true,
    ARRAY['manufacturing', 'office', 'banking'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['espionaje', 'informacion', 'competencia'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Acoso y hostigamiento',
    'Conductas inapropiadas hacia empleados',
    'Sociales',
    true,
    ARRAY['manufacturing', 'logistics', 'retail', 'office', 'banking', 'healthcare', 'education'],
    ARRAY['mexico', 'latam'],
    'medium',
    ARRAY['acoso', 'hostigamiento', 'laboral'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Acceso no autorizado a áreas restringidas',
    'Ingreso de personal a zonas prohibidas',
    'Sociales',
    true,
    ARRAY['manufacturing', 'banking', 'healthcare'],
    ARRAY['mexico', 'latam'],
    'medium',
    ARRAY['acceso', 'restringido', 'seguridad'],
    (SELECT id FROM temp_admin)
  ),
  (
    'Violencia externa',
    'Agresiones de terceros ajenos a la organización',
    'Sociales',
    true,
    ARRAY['retail', 'banking', 'healthcare'],
    ARRAY['mexico', 'latam'],
    'high',
    ARRAY['violencia', 'externa', 'agresion'],
    (SELECT id FROM temp_admin)
  );

-- =============================================
-- CLEANUP
-- =============================================

DROP TABLE IF EXISTS temp_admin;

-- =============================================
-- VERIFICATION QUERY (Optional - for testing)
-- =============================================

-- Count inserted records
DO $$
DECLARE
  asset_count int;
  threat_count int;
BEGIN
  SELECT COUNT(*) INTO asset_count FROM asset_catalog WHERE is_global = true;
  SELECT COUNT(*) INTO threat_count FROM threat_catalog WHERE is_global = true;

  RAISE NOTICE 'Seed completed successfully!';
  RAISE NOTICE 'Total global assets: %', asset_count;
  RAISE NOTICE 'Total global threats: %', threat_count;
END $$;
