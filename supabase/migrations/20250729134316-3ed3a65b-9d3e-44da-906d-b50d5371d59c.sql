-- Fix search path for the new function
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;