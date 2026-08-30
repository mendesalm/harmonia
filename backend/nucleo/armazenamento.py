"""
Módulo de Gerenciamento do Sistema de Arquivos Multi-Tenant.
Provisiona pastas isoladas e gerencia o upload/deleção de músicas físicas.
"""
import os
import shutil
from pathlib import Path
from backend.nucleo.configuracoes import configuracoes
from backend.nucleo.formatadores import gerar_slug_limpo


class ServicoArmazenamentoTenant:
    """Serviço responsável pela governança do armazenamento físico de cada Tenant."""

    @classmethod
    def obter_diretorio_publico(cls, slug_tenant: str) -> Path:
        """Retorna o caminho do diretório público do tenant."""
        caminho = configuracoes.DIRETORIO_INSTANCIAS_PUBLIC / slug_tenant
        caminho.mkdir(parents=True, exist_ok=True)
        return caminho

    @classmethod
    def obter_diretorio_musicas(cls, slug_tenant: str) -> Path:
        """Retorna o caminho da pasta de músicas do tenant."""
        caminho = cls.obter_diretorio_publico(slug_tenant) / "musicas"
        caminho.mkdir(parents=True, exist_ok=True)
        return caminho

    @classmethod
    def obter_diretorio_privado(cls, slug_tenant: str) -> Path:
        """Retorna o caminho do diretório privado do tenant."""
        caminho = configuracoes.DIRETORIO_INSTANCIAS_PRIVATE / slug_tenant
        caminho.mkdir(parents=True, exist_ok=True)
        return caminho

    @classmethod
    def provisionar_estrutura_tenant(cls, slug_tenant: str) -> dict:
        """
        Cria toda a árvore de diretórios necessária para o novo Tenant.
        Estrutura criada:
        - armazenamento/instancias/public/{slug_tenant}/musicas
        - armazenamento/instancias/private/{slug_tenant}/
        """
        slug_formatado = gerar_slug_limpo(slug_tenant)
        dir_publico = cls.obter_diretorio_publico(slug_formatado)
        dir_musicas = cls.obter_diretorio_musicas(slug_formatado)
        dir_privado = cls.obter_diretorio_privado(slug_formatado)

        return {
            "slug": slug_formatado,
            "diretorio_publico": str(dir_publico),
            "diretorio_musicas": str(dir_musicas),
            "diretorio_privado": str(dir_privado)
        }

    @classmethod
    def salvar_arquivo_musica(cls, slug_tenant: str, nome_arquivo: str, conteudo_bytes: bytes) -> str:
        """
        Salva o arquivo de áudio no disco e retorna o caminho relativo público acessível via HTTP.
        Exemplo de retorno: "/storage/instancias/public/GOB_Loja2181/musicas/abertura.mp3"
        """
        pasta_musicas = cls.obter_diretorio_musicas(slug_tenant)
        nome_arquivo_seguro = gerar_slug_limpo(Path(nome_arquivo).stem) + Path(nome_arquivo).suffix.lower()
        caminho_completo = pasta_musicas / nome_arquivo_seguro
        
        # Se já existir arquivo com esse nome, adiciona sufixo numérico
        contador = 1
        while caminho_completo.exists():
            nome_arquivo_seguro = f"{gerar_slug_limpo(Path(nome_arquivo).stem)}_{contador}{Path(nome_arquivo).suffix.lower()}"
            caminho_completo = pasta_musicas / nome_arquivo_seguro
            contador += 1

        with open(caminho_completo, "wb") as f:
            f.write(conteudo_bytes)

        # URL relativa para servir estaticamente
        caminho_relativo = f"/storage/instancias/public/{slug_tenant}/musicas/{nome_arquivo_seguro}"
        return caminho_relativo

    @classmethod
    def remover_arquivo_musica(cls, caminho_relativo: str) -> bool:
        """Remove o arquivo físico do disco com base no caminho relativo."""
        if not caminho_relativo or not caminho_relativo.startswith("/storage/instancias/public/"):
            return False
        
        caminho_sub = caminho_relativo.replace("/storage/instancias/public/", "")
        caminho_absoluto = configuracoes.DIRETORIO_INSTANCIAS_PUBLIC / caminho_sub
        
        if caminho_absoluto.exists() and caminho_absoluto.is_file():
            try:
                os.remove(caminho_absoluto)
                return True
            except OSError:
                return False
        return False
