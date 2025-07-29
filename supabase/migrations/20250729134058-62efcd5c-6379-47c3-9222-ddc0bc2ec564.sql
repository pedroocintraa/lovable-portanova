-- Update status_venda enum to include new statuses
ALTER TYPE status_venda RENAME TO status_venda_old;

CREATE TYPE status_venda AS ENUM (
  'pendente',
  'em_andamento', 
  'auditada',
  'gerada',
  'aguardando_habilitacao',
  'habilitada',
  'perdida'
);

-- Update vendas table with new enum and additional fields
ALTER TABLE vendas 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE status_venda USING 
    CASE status::text
      WHEN 'gerada' THEN 'pendente'::status_venda
      WHEN 'em_andamento' THEN 'em_andamento'::status_venda
      WHEN 'aprovada' THEN 'habilitada'::status_venda
      WHEN 'perdida' THEN 'perdida'::status_venda
      ELSE 'pendente'::status_venda
    END,
  ALTER COLUMN status SET DEFAULT 'pendente'::status_venda;

-- Add new fields
ALTER TABLE vendas 
  ADD COLUMN data_instalacao DATE,
  ADD COLUMN motivo_perda TEXT;

-- Update historico_vendas table enum
ALTER TABLE historico_vendas 
  ALTER COLUMN status_anterior TYPE status_venda USING 
    CASE status_anterior::text
      WHEN 'gerada' THEN 'pendente'::status_venda
      WHEN 'em_andamento' THEN 'em_andamento'::status_venda  
      WHEN 'aprovada' THEN 'habilitada'::status_venda
      WHEN 'perdida' THEN 'perdida'::status_venda
      ELSE 'pendente'::status_venda
    END,
  ALTER COLUMN status_novo TYPE status_venda USING
    CASE status_novo::text
      WHEN 'gerada' THEN 'pendente'::status_venda
      WHEN 'em_andamento' THEN 'em_andamento'::status_venda
      WHEN 'aprovada' THEN 'habilitada'::status_venda  
      WHEN 'perdida' THEN 'perdida'::status_venda
      ELSE 'pendente'::status_venda
    END;

-- Drop old enum
DROP TYPE status_venda_old;

-- Create function to validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is 'habilitada', prevent any updates except by admins
  IF OLD.status = 'habilitada' AND NOT is_admin_or_supervisor() THEN
    RAISE EXCEPTION 'Cannot modify sales with status "habilitada"';
  END IF;
  
  -- Validate status transitions
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Define valid transitions
    IF (OLD.status = 'pendente' AND NEW.status NOT IN ('em_andamento', 'perdida')) OR
       (OLD.status = 'em_andamento' AND NEW.status NOT IN ('auditada', 'perdida')) OR
       (OLD.status = 'auditada' AND NEW.status NOT IN ('gerada', 'perdida')) OR
       (OLD.status = 'gerada' AND NEW.status NOT IN ('aguardando_habilitacao', 'perdida')) OR
       (OLD.status = 'aguardando_habilitacao' AND NEW.status NOT IN ('habilitada', 'perdida')) OR
       (OLD.status = 'habilitada' AND NEW.status != 'habilitada') OR
       (OLD.status = 'perdida' AND NEW.status != 'perdida') THEN
      RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
    END IF;
    
    -- Require motivo_perda when marking as lost
    IF NEW.status = 'perdida' AND (NEW.motivo_perda IS NULL OR trim(NEW.motivo_perda) = '') THEN
      RAISE EXCEPTION 'motivo_perda is required when marking sale as lost';
    END IF;
    
    -- Require data_instalacao when moving to habilitada
    IF NEW.status = 'habilitada' AND NEW.data_instalacao IS NULL THEN
      RAISE EXCEPTION 'data_instalacao is required when marking sale as habilitada';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for status validation
CREATE TRIGGER validate_vendas_status_transition
  BEFORE UPDATE ON vendas
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_transition();