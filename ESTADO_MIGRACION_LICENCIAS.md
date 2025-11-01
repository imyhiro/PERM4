# 🚀 ESTADO DE MIGRACIÓN - SISTEMA DE LICENCIAS

**Fecha de inicio:** 2025-01-01
**Última actualización:** FASE 1 COMPLETADA ✅

---

## 📊 PLAN GENERAL

### **FASE 1: Fundación de Licencias** ✅ COMPLETADA
- [x] 1.1 Crear migración SQL para mover licencias a tabla users
- [x] 1.2 Actualizar database.types.ts con nuevos tipos
- [x] 1.3 Modificar OrganizationsPage (quitar selección de licencia)
- [x] 1.4 Modificar SitesPage (agregar validaciones de límites)
- [x] 1.5 Modificar Dashboard (mostrar info de licencia del usuario)
- [x] 1.6 Modificar UsersPage (mostrar contadores de orgs/sitios)
- [x] 1.7 Aplicar migración en Supabase
- [x] 1.8 Commit y push de cambios

**Commit:** 8830c0b
**Pushed:** ✓ main -> origin/main

### **FASE 2: UI de Upgrade** ⏸️ PENDIENTE
- [ ] 2.1 Crear componente UpgradePlanModal
- [ ] 2.2 Agregar botón "Actualizar Plan" en Dashboard
- [ ] 2.3 Mostrar comparativa de planes (FREE/PRO/PROMAX)
- [ ] 2.4 (Opcional) Super admin puede cambiar licencia manualmente

### **FASE 3: Integración de Pagos** ⏸️ PENDIENTE
- [ ] 3.1 Setup Stripe (productos, precios)
- [ ] 3.2 Crear tabla payment_history
- [ ] 3.3 Endpoints API para checkout
- [ ] 3.4 Webhooks de Stripe
- [ ] 3.5 Cronjob para verificar expiración
- [ ] 3.6 (Opcional) PayPal
- [ ] 3.7 (Opcional) Facturación SAT

---

## 🎯 ESTADO ACTUAL

**FASE ACTIVA:** ✅ FASE 1 COMPLETADA

**ÚLTIMO COMMIT:**
```
Feat: Migrar sistema de licencias de organizaciones a usuarios (Fase 1)
Hash: 8830c0b
Branch: main -> origin/main
```

**SIGUIENTE PASO:**
FASE 2 - UI de Upgrade (cuando tengas usuarios interesados en pagar)

---

## 📝 MODELO DE LICENCIAS

### Planes definidos:

| Plan     | Orgs       | Sitios     | IA  | Precio        |
|----------|------------|------------|-----|---------------|
| FREE     | 1          | 3          | ✗   | $0            |
| PRO      | Ilimitadas | 10         | ✓   | $450/mes      |
| PROMAX   | Ilimitadas | Ilimitadas | ✓   | $1,500/mes    |

**Descuento anual:** 20% en todos los planes pagados

**Reglas de negocio:**
- Licencias están a nivel USUARIO (no organización)
- Conteo de sitios es GLOBAL (suma de todas las organizaciones del user)
- Al registrarse, usuario obtiene plan FREE automáticamente
- Validaciones en creación de ORG y SITIO según límites del plan

---

## 🔄 COMANDOS RÁPIDOS

### Verificar estado actual:
```bash
cat ESTADO_MIGRACION_LICENCIAS.md
```

### Continuar con Fase 1:
```bash
# Decirle a Claude: "Continuar con FASE 1 del archivo ESTADO_MIGRACION_LICENCIAS.md"
```

### Ver cambios pendientes:
```bash
git status
git diff
```

### Rollback si algo sale mal:
```bash
# Revertir último commit (código)
git reset --soft HEAD~1

# Revertir migración (base de datos)
# Ver supabase/migrations/[timestamp]_revert_license_migration.sql
```

---

## ⚠️ NOTAS IMPORTANTES

1. **Respaldo:** Commit hecho antes de migración ✓
2. **Datos existentes:** Todos los users recibirán license_type='free' por default
3. **Migraciones reversibles:** Cada migración tiene su rollback
4. **Tokens disponibles:** ~115,000 (suficiente para Fase 1)

---

## 📞 CONTACTO EN CASO DE PROBLEMAS

- Revisar este archivo para ver último estado
- Verificar último commit en git
- Consultar migraciones en `supabase/migrations/`
