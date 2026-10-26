/**
 * Gerenciador de Normalização e Controle de Volume via Web Audio API.
 *
 * Resolve o problema de faixas com gravações de níveis díspares (algumas altas, outras baixas)
 * e elimina a oscilação percebida em volumes baixos (Surdina):
 *
 * 1. DynamicsCompressorNode: Compressor de áudio de estúdio que estabiliza a faixa dinâmica,
 *    elevando passagens suaves e controlando picos de forma musical e uniforme.
 * 2. GainNode com Rampa Linear: Transições suaves de ganho (40ms) que evitam estalos
 *    e oscilações abruptas no volume master ou ao ligar/desligar a Surdina.
 */
class GerenciadorNormalizadorAudio {
  private audioCtx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private gainNode: GainNode | null = null;
  private elementoConectado = false;
  private volumeAtual = 1.0;

  /**
   * Conecta o elemento HTML5 `<audio>` à cadeia de processamento e normalização.
   * Conecta apenas uma vez por elemento para evitar erro de nó reutilizado no Web Audio.
   */
  public inicializar(audioEl: HTMLAudioElement) {
    if (this.elementoConectado) return;
    try {
      const AudioCtxClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();

      // Configuração profissional de compressão e normalização ritualística
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-22, this.audioCtx.currentTime); // limiar de início de compressão (-22 dB)
      this.compressor.knee.setValueAtTime(24, this.audioCtx.currentTime);        // transição suave de joelho
      this.compressor.ratio.setValueAtTime(6, this.audioCtx.currentTime);         // taxa de compressão 6:1
      this.compressor.attack.setValueAtTime(0.005, this.audioCtx.currentTime);    // ataque rápido (5ms)
      this.compressor.release.setValueAtTime(0.20, this.audioCtx.currentTime);    // liberação musical (200ms)

      // Nó de ganho mestre estabilizado
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.volumeAtual, this.audioCtx.currentTime);

      const fonte = this.audioCtx.createMediaElementSource(audioEl);
      fonte.connect(this.compressor);
      this.compressor.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      this.elementoConectado = true;
    } catch (e) {
      // Fallback gracioso: o navegador usa o volume nativo do HTML5 AudioElement
      console.warn('Web Audio Normalizer não ativado (usando fallback nativo):', e);
    }
  }

  /**
   * Retoma o AudioContext caso esteja em estado 'suspended' pelo bloqueio de autoplay do navegador.
   */
  public retomarContexto() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  /**
   * Aplica o novo volume de execução de forma estabilizada e contínua.
   * @param volumeFloat Valor de 0.0 a 1.0
   * @param audioEl Fallback nativo
   */
  public aplicarVolume(volumeFloat: number, audioEl?: HTMLAudioElement | null) {
    const seguro = Math.max(0, Math.min(1, volumeFloat));
    this.volumeAtual = seguro;

    if (this.audioCtx && this.gainNode && this.elementoConectado) {
      try {
        const agora = this.audioCtx.currentTime;
        this.gainNode.gain.cancelScheduledValues(agora);
        // Rampa suave de 40ms: estabiliza a transição sem estalos nem oscilações
        this.gainNode.gain.linearRampToValueAtTime(seguro, agora + 0.04);
      } catch {
        this.gainNode.gain.value = seguro;
      }
    }

    // Mantém o audioEl sincronizado caso a saída direta seja utilizada
    if (audioEl) {
      audioEl.volume = seguro;
    }
  }
}

export const normalizadorAudio = new GerenciadorNormalizadorAudio();
