# Correções de Interatividade do Player 3D e Unicidade de Favoritos

Neste ciclo de correções, validamos o comportamento da aplicação no navegador e resolvemos problemas silenciosos que causavam dessincronização entre a interface e o banco de dados.

## O Que Foi Realizado

### 1. Correção da Cascata de Props no Carrossel 3D
- **Sintoma:** O clique na estrela amarela não registrava nada no banco de dados e as alterações se perdiam com `F5`.
- **Causa:** O componente `Carrossel3DMomentos` interceptava a prop `onAlternarPreferencia` vinda da página principal, mas não repassava para os cartões individuais (`CardMomento3D`). Com isso, a função de salvar no banco nunca era disparada pelo clique do usuário.
- **Resolução:** A prop foi restaurada no delegamento interno e agora o componente volta a se comunicar com a API via método `PATCH`.

### 2. Preservação do Metadado "Preferida" na Atualização de Estado
- **Sintoma:** Ao salvar a estrela, ela acendia, enviava ao banco (e o banco confirmava), mas o componente apagava logo em seguida.
- **Causa:** Após salvar o status favoritado e recarregar os dados da sessão, o Javascript realizava um _fetch_ paralelo da lista crua de músicas (`GET /musicas`) para o catálogo geral e substituía a lista da sessão por ela. Como a rota `/musicas` bruta não retornava relacionamentos cruzados, o status `preferida` era esmagado.
- **Resolução:** Implementada rotina de mesclagem (_merge_) no frontend que injeta cirurgicamente o selo `preferida` da sessão dentro da lista completa retornada pelo catálogo. O React agora preserva visualmente o selo de preferência.

### 3. Melhoria Visual do Tempo e Equalizador
- **Sintoma:** A música em execução exibia quatro barras animadas onde deveria estar o tempo (0:00).
- **Resolução:** 
  - As barras (Equalizador) foram realocadas para o container de controle de áudio (rodapé), coladas ao título da música (em cor Esmeralda).
  - O cartão da música no carrossel 3D voltou a exibir exclusivamente a minutagem e segundos, de forma clara (ex: `3:45`) e com a cor Ciano.

## Validação
- O sistema de exclusão mútua (`toggle`) das músicas em um momento litúrgico foi consolidado.
- Nenhuma outra música é apagada acidentalmente sem que o banco reflita.
- Animações reordenadas para um layout mais enxuto.
