-- Row Level Security: todas as tabelas multi-tenant devem ter tenant_id
-- e policies que filtram por app.current_setting('app.tenant_id')

-- Função para definir tenant no contexto da sessão
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_uuid::text, true);
END;
$$ LANGUAGE plpgsql;

-- Exemplo de policy para tabela com tenant_id:
-- CREATE POLICY tenant_isolation ON nome_tabela
--   USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);
