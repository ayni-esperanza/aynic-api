-- Script para arreglar la columna numero en ordenes_compra
-- Ejecutar este script antes de iniciar la aplicación

-- Opción 1: Generar números automáticos para registros existentes
UPDATE ordenes_compra 
SET numero = CONCAT('OC-', LPAD(id::text, 6, '0'))
WHERE numero IS NULL;

-- Verificar que todos los registros tienen número
SELECT COUNT(*) as registros_sin_numero FROM ordenes_compra WHERE numero IS NULL;

-- Si quieres hacer la columna NOT NULL nuevamente después de actualizar (opcional)
-- ALTER TABLE ordenes_compra ALTER COLUMN numero SET NOT NULL;
