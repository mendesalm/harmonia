# Ajustes Conceituais e Estruturais (Globalização de Acervo e Unicidade)

Este plano descreve as alterações necessárias no banco de dados, modelos ORM e regras de negócio da API para atender aos novos requisitos arquiteturais.

## User Review Required

> [!IMPORTANT]
> Transformar o acervo de músicas em **Global** implica que todas as Lojas (Organizações) enxergarão o mesmo catálogo de arquivos de áudio. Confirme se as lojas também deverão ter acesso de edição/exclusão mútua, ou se a exclusão de uma música deve apenas desvinculá-la do momento daquela loja, preservando o arquivo físico para as demais.

> [!TIP]
> Para evitar uploads duplicados, a abordagem mais robusta é utilizar um hash (ex: SHA-256) do arquivo. Isso garante que mesmo que arquivos idênticos tenham nomes diferentes, o sistema não gastará espaço no servidor e apenas reaproveitará a música já existente.

## Proposed Changes

### Banco de Dados & Modelos ORM

#### [MODIFY] `backend/modelos/musica.py`
- Alterar `organizacao_id` para `Optional[uuid.UUID]` (nullable), permitindo que músicas pertençam ao catálogo global (sem loja específica).
- Adicionar coluna `hash_arquivo: Mapped[Optional[str]] = mapped_column(String(64), index=True)` para identificar unicamente arquivos e evitar repetições no HD.

#### [MODIFY] `backend/modelos/evento.py`
- Adicionar `UniqueConstraint("nome", "organizacao_id", name="uq_evento_nome_org")` para evitar momentos/eventos com nomes duplicados dentro de uma mesma loja.

#### [MODIFY] `backend/modelos/sessao.py`
- Adicionar `UniqueConstraint("nome", "organizacao_id", name="uq_sessao_nome_org")` para evitar sessões com nomes duplicados dentro da mesma loja.

#### [MODIFY] `backend/inicializar_banco.py`
- Inserir comandos `ALTER TABLE` para:
  - `ALTER TABLE musicas ALTER COLUMN organizacao_id DROP NOT NULL;`
  - `ALTER TABLE musicas ADD COLUMN IF NOT EXISTS hash_arquivo VARCHAR(64);`
  - Aplicar as restrições de unicidade (via `ADD CONSTRAINT`).

### Lógica da API (Endpoints)

#### [MODIFY] `backend/api/musicas/rotas.py`
- **Upload:** Ao receber um arquivo de áudio, calcular o hash SHA-256. Consultar se `hash_arquivo` já existe no catálogo. 
  - Se existir: apenas vincular a música existente ao momento desejado.
  - Se não existir: prosseguir com o upload e o registro normal.
- **Listagem:** Ajustar as queries para listar todas as músicas globais, removendo o filtro estrito obrigatório de `organizacao_id`.

#### [MODIFY] `backend/api/eventos/rotas.py` & `backend/api/sessoes/rotas.py`
- Ao cadastrar novo Evento (Momento) ou Sessão, capturar o erro de integridade (ou fazer uma query prévia) para retornar um erro amigável (HTTP 400 ou 409) informando: *"Já existe um momento/sessão cadastrado com este nome."*

## Verification Plan

### Automated Tests
- Testar envio do mesmo arquivo MP3 duas vezes e verificar se o storage manteve apenas um arquivo, e se o banco reaproveitou o registro.
- Tentar cadastrar duas sessões chamadas "Sessão Magna" para a mesma Loja e atestar que a API bloqueia com mensagem amigável.
