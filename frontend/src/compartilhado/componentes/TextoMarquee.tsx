import React, { useRef, useState, useEffect } from 'react';

interface TextoMarqueeProps {
  texto: string;
  className?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
}

/**
 * Componente de Texto com Efeito Marquee (Letreiro Deslizante) Inteligente.
 * Se o texto couber no container, permanece estático e perfeitamente legível.
 * Se extrapolar a largura, desliza suavemente da direita para a esquerda em vaivém (ping-pong),
 * com pausas nas extremidades para possibilitar leitura confortável no Templo.
 */
export const TextoMarquee: React.FC<TextoMarqueeProps> = ({
  texto,
  className = '',
  tag: Tag = 'div',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textoRef = useRef<HTMLSpanElement>(null);
  const [diff, setDiff] = useState(0);

  useEffect(() => {
    const medir = () => {
      if (containerRef.current && textoRef.current) {
        const larguraContainer = containerRef.current.clientWidth;
        const larguraTexto = textoRef.current.scrollWidth;
        const diferenca = larguraTexto - larguraContainer;
        setDiff(diferenca > 4 ? diferenca : 0);
      }
    };

    medir();
    const timeout = setTimeout(medir, 200);
    window.addEventListener('resize', medir);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', medir);
    };
  }, [texto]);

  const precisaMarquee = diff > 0;
  // Duração calculada proporcionalmente ao tamanho do texto (mínimo 6s)
  const duracao = Math.max(6, Math.min(18, diff / 18 + 4));

  return (
    <div
      ref={containerRef}
      className="overflow-hidden w-full max-w-full relative select-none"
      title={texto}
    >
      <Tag
        ref={textoRef}
        className={`inline-block whitespace-nowrap will-change-transform ${className}`}
        style={
          precisaMarquee
            ? ({
                '--diff-marquee': `-${diff}px`,
                animation: `harmonia-marquee-pingpong ${duracao}s ease-in-out infinite alternate`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {texto}
      </Tag>
    </div>
  );
};
