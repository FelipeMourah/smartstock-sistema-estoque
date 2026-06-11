import React, { useRef, useState, useEffect } from "react";
import { Camera, Image, CheckCircle, RefreshCw, Mic, Volume2, MicOff, PlayCircle } from "lucide-react";
import { InventoryItem } from "../types";

interface CameraIAProps {
  onUpdateInventory: (newInventory: InventoryItem[]) => void;
}

export default function CameraIA({ onUpdateInventory }: CameraIAProps) {
  // Device Webcam states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const [cameraSupported, setCameraSupported] = useState<boolean>(true);

  // Simulation / Custom inputs state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [gallery, setGallery] = useState<Array<{id: string; src: string; rotation?: number; note?: string}>>([]);
  const [audioPermissionGranted, setAudioPermissionGranted] = useState<boolean | null>(null);
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);

  // Vision results
  const [visionResponse, setVisionResponse] = useState<any[] | null>(null);
  const [lastScanRecord, setLastScanRecord] = useState<any[]>([
    { name: "Arroz Tio João 5kg", quantity: 10, category: "Grãos" },
    { name: "Feijão Carioca 1kg", quantity: 6, category: "Grãos" },
    { name: "Óleo de Soja 900ml", quantity: 12, category: "Alimentação" }
  ]);

  // Audio / Voice (desabilitado para foco em câmera e upload)
  // Mantido apenas como placeholders para não quebrar layout/state externos.
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceIsLoading, setVoiceIsLoading] = useState(false);
  const [voiceFeedbackText, setVoiceFeedbackText] = useState("");


  // Simulated preset pictures matching Image 5 logic for robust demoing
  // (Removed - no longer needed)

  // Speech suggestions to guide the professor/reviewer
  // (Removed - no longer needed)

  // Try opening physical webcam on mount as progressive enhancement
  const startCamera = async () => {
    setCameraErrorMessage(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraSupported(false);
      setCameraPermissionGranted(false);
      setStreamActive(false);
      setCameraErrorMessage("Seu navegador não suporta acesso à câmera ou não está sendo executado em um contexto seguro.");
      return;
    }

    try {
      setCameraSupported(true);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.autoplay = true;
        videoRef.current.muted = true;
        const playPromise = videoRef.current.play();
        if (playPromise && typeof playPromise.then === "function") {
          playPromise.catch((playError) => {
            console.warn("Falha ao iniciar reprodução de vídeo automático:", playError);
          });
        }
        setStreamActive(true);
        setCameraPermissionGranted(true);
        setUploadedImage(null);
      }
    } catch (err: any) {
      console.warn("Falha ao ativar câmera:", err);
      const errorMessage = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
        ? "Permissão de câmera negada. Liberte o acesso nas configurações do navegador."
        : err?.message || "Não foi possível acessar a câmera.";
      setCameraErrorMessage(errorMessage);
      setCameraPermissionGranted(false);
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraSupported(false);
      setCameraErrorMessage("Seu navegador não suporta captura de vídeo ou não está sendo executado em um contexto seguro.");
    }
    return () => {
      stopCamera();
    };
  }, []);

  // Web File Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const src = reader.result as string;
        setUploadedImage(src);
        addToGallery(src);
        // Temporarily stop camera to display file
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const addToGallery = (src: string) => {
    const id = "img-" + Date.now();
    setGallery((g) => [{ id, src, rotation: 0 }, ...g]);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg");
    setUploadedImage(data);
    addToGallery(data);
  };

  const requestAudioPermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Seu navegador não suporta captura de áudio via WebRTC nesta aba. Use o recurso de voz offline ou um navegador compatível.");
      setAudioPermissionGranted(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setAudioPermissionGranted(true);
      startSpeechRecognition();
    } catch (err: any) {
      setAudioPermissionGranted(false);
      alert("Não foi possível obter permissão de áudio. Verifique o microfone e tente novamente.");
    }
  };


  // Vision analyzer triggers express endpoint
  const analyzeWithVision = async () => {
    setIsVisionLoading(true);
    setVisionResponse(null);

    try {
      let imagePayload = uploadedImage || "";

      // If camera is streaming, capture frame from video canvas!
      if (streamActive && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          imagePayload = canvas.toDataURL("image/jpeg");
        }
      }

      if (!imagePayload) {
        alert("Por favor, capture ou selecione uma imagem para analisar.");
        setIsVisionLoading(false);
        return;
      }

      const response = await fetch("/api/ai/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imagePayload
        })
      });

      if (!response.ok) {
        throw new Error("Falha de processamento na visão computacional");
      }

      const data = await response.json();
      if (data.success) {
        setVisionResponse(data.itemsDetected || []);
        if (data.itemsDetected && data.itemsDetected.length > 0) {
          setLastScanRecord(data.itemsDetected);
        }
        if (data.inventory) {
          onUpdateInventory(data.inventory);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro na leitura inteligente: " + err.message);
    } finally {
      setIsVisionLoading(false);
    }
  };

  // Chrome Web Speech API integration for dynamic audio recording
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não oferece suporte nativo à gravação por voz via Web Speech API. Use as sugestões rápidas abaixo.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListeningVoice(true);
      setVoiceTranscript("");
      setVoiceFeedbackText("Estou ouvindo... Fale o item e a quantidade!");
    };

    rec.onerror = (e: any) => {
      console.warn("Erro no microfone:", e.error);
      setVoiceFeedbackText("Uso bloqueado ou sem sinal de áudio.");
      setIsListeningVoice(false);
    };

    rec.onend = () => {
      setIsListeningVoice(false);
    };

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setVoiceTranscript(text);
      triggerVoiceExecution(text);
    };

    rec.start();
  };

  // Submit spoken commands to backend Gemini interpreter
  const triggerVoiceExecution = async (text: string) => {
    setVoiceIsLoading(true);
    setVoiceFeedbackText(`Analisando comando: "${text}"...`);

    try {
      const response = await fetch("/api/ai/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text })
      });

      if (!response.ok) {
        throw new Error("Erro na rede interpretando áudio");
      }

      const data = await response.json();
      if (data.success && data.parsedCommand) {
        const pc = data.parsedCommand;
        setVoiceFeedbackText(
          `✓ Interpretado: ${pc.action === "add" ? "Adicionado" : "Removido"} ${pc.quantity} un de "${pc.name}" (${pc.category})`
        );
        if (data.inventory) {
          onUpdateInventory(data.inventory);
        }
      }
    } catch (err: any) {
      console.error(err);
      setVoiceFeedbackText("Falha ao analisar intenção por voz.");
    } finally {
      setVoiceIsLoading(false);
    }
  };

  return (
    <div id="ai-camera-view" className="flex-1 p-6 lg:p-10 font-sans text-gray-800 overflow-y-auto animate-fade-in">
      
      {/* Title Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
          Câmera IA
        </h1>
        <p className="text-gray-500 text-xs font-semibold mt-1 font-sans">
          Fotografe o estoque — a IA conta e classifica automaticamente
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Photo Frame view & presets selection */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 relative">
            
            {/* Viewport frame matching Image 5 */}
            <div className="w-full aspect-video bg-[#0b1b24] rounded-xl overflow-hidden relative flex flex-col items-center justify-center border border-gray-100">
              
              <video
                ref={videoRef}
                className={`w-full h-full object-cover scale-x-[-1] ${streamActive ? "block" : "hidden"}`}
                autoPlay
                playsInline
                muted
              />

              {!streamActive && uploadedImage ? (
                /* Simulated uploaded photo */
                <img 
                  src={uploadedImage} 
                  alt="Estoque para analisar" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : null}

              {!streamActive && !uploadedImage ? (
                /* Uninitialized placeholder display */
                <div className="text-center p-6 text-gray-400">
                  <div className="w-12 h-12 bg-emerald-950/20 border border-emerald-800/25 rounded-2xl flex items-center justify-center text-[#1aa275] mx-auto mb-3.5">
                    <Camera size={20} />
                  </div>
                  <h4 className="text-gray-200 font-bold text-xs">Câmera pronta</h4>
                  <p className="text-gray-500 text-[10px] max-w-xs mt-1">Clique para iniciar ou escolha uma foto para demonstração visual abaixo</p>
                </div>
              ) : null}

              {/* Action buttons embedded in bottom center of frame */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 px-4 z-10">
                
                {streamActive ? (
                  <button
                    onClick={stopCamera}
                    className="h-8 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-lg cursor-pointer"
                  >
                    Desligar Câmera
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    disabled={!cameraSupported}
                    className={`h-8 px-4 text-xs font-bold text-white rounded-lg shadow-lg flex items-center gap-1.5 transition-all ${cameraSupported ? "bg-[#0e2c3d] hover:bg-[#11354a] border border-[#16445c] cursor-pointer" : "bg-gray-300 text-gray-600 border border-gray-200 cursor-not-allowed"}`}
                  >
                    <RefreshCw size={12} />
                    <span>{cameraSupported ? "Ligar Webcam" : "Webcam indisponível"}</span>
                  </button>
                )}

                {/* Upload Trigger File */}
                <label className="h-8 px-4 text-xs font-bold text-gray-300 bg-[#0e2c3d]/90 hover:bg-[#11354a] border border-[#16445c] rounded-lg shadow-lg flex items-center gap-1.5 cursor-pointer">
                  <Image size={12} />
                  <span>Upload Foto</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
                </label>

                <button
                  onClick={capturePhoto}
                  className="h-8 px-4 text-xs font-bold text-white bg-[#1aa275] hover:bg-[#158c64] rounded-lg shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera size={12} />
                  <span>Capturar Foto</span>
                </button>

                <button
                  onClick={requestAudioPermission}
                  className="h-8 px-4 text-xs font-bold text-white bg-[#0b74ff] hover:bg-[#095fd1] rounded-lg shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Mic size={12} />
                  <span>Ativar Áudio</span>
                </button>

              </div>

              {cameraErrorMessage && (
                <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-100 p-3 text-rose-800 text-[11px]">
                  {cameraErrorMessage}
                </div>
              )}
              {!cameraSupported && (
                <div className="mt-4 rounded-2xl bg-yellow-50 border border-yellow-100 p-3 text-yellow-700 text-[11px]">
                  A câmera não está disponível neste navegador. Utilize upload de imagem ou acesse este app em um navegador moderno compatível com WebRTC.
                </div>
              )}

              <div className="mt-3 flex items-center justify-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold ${
                    streamActive ? "bg-emerald-500/25 text-emerald-400 border border-emerald-400/30" : "bg-gray-600/45 text-gray-300 border border-gray-600/20"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${streamActive ? "bg-emerald-400 animate-ping" : "bg-gray-400"}`} />
                  {streamActive ? "Webcam ao vivo" : "Arquivo/Simulado"}
                </span>
              </div>
            </div>

            {/* Hidden canvas tool for webcam snapping */}
            <canvas ref={canvasRef} className="hidden" />



          </div>

          {/* ADD BY VOICE Panel - Premium Academic presentation feature */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 text-xs tracking-wide flex items-center gap-2 mb-2 font-sans uppercase">
              <Volume2 size={16} className="text-emerald-500 animate-pulse" />
              Lançamento por comando de voz inteligente (Microfone IA)
            </h3>


            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              
              {/* Voice record action */}
              <button
                id="voice-mic-trigger"
                onClick={startSpeechRecognition}
                disabled={voiceIsLoading}
                className={`flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                  isListeningVoice 
                    ? "bg-rose-50 border-rose-300 text-rose-600 animate-pulse" 
                    : "bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-800"
                }`}
              >
                <Mic size={16} className={isListeningVoice ? "text-rose-500 animate-bounce" : ""} />
                <span>{isListeningVoice ? "Ouvindo... Pare seu áudio" : "Falar comando"}</span>
              </button>

              <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100 select-none min-h-[44px] flex items-center">
                <span className="text-xs italic text-gray-500 font-sans break-all">
                  {voiceFeedbackText || "Microfone pronto em modo offline/online."}
                </span>
              </div>

            </div>



          </div>

        </div>

        {/* Right Side: Analysis results box & latest scans listing matching image */}
        <div className="lg:col-span-4 space-y-4">

          {/* Gallery Thumbnails */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h4 className="text-xs font-bold text-gray-600 mb-3">Galeria de Imagens</h4>
            {gallery.length === 0 ? (
              <div className="text-center text-[11px] text-gray-400 py-6">Nenhuma imagem capturada ainda.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {gallery.map((g) => (
                  <div key={g.id} className="relative">
                    <img src={g.src} alt="thumb" className="w-full h-20 object-cover rounded" />
                    <div className="absolute right-1 top-1 flex gap-1">
                      <button onClick={() => setGallery((s) => s.map(it => it.id === g.id ? {...it, rotation: ((it.rotation||0)+90)%360} : it))} className="p-1 bg-white/80 rounded text-xs">⤾</button>
                      <button onClick={() => { setGallery((s) => s.filter(it => it.id !== g.id)); if (uploadedImage === g.src) setUploadedImage(null); }} className="p-1 bg-white/80 rounded text-xs">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Analyze control button */}
          <button
            id="btn-trigger-ai-compute"
            onClick={analyzeWithVision}
            disabled={isVisionLoading}
            className="w-full h-12 bg-[#1aa275] hover:bg-[#158c64] disabled:bg-emerald-200 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all border border-[#1aa275] cursor-pointer shadow-lg shadow-emerald-950/10 flex items-center justify-center gap-2"
          >
            {isVisionLoading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Processando Visão Computacional...</span>
              </>
            ) : (
              <span>Analisar com IA</span>
            )}
          </button>

          {/* Resultado atual panel from Image 5 */}
          <div id="vision-results-card" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-500 text-[10px] uppercase tracking-wider mb-4 pb-2 border-b border-gray-50">
              ✓ Resultado atual
            </h3>

            {!visionResponse ? (
              <div className="text-center py-6 text-gray-400">
                <p className="text-xs font-bold">Nenhuma detecção ainda.</p>
                <p className="text-[10px] text-gray-400 mt-1">Mande analisar para começar.</p>
              </div>
            ) : visionResponse.length === 0 ? (
              <p className="text-xs text-amber-600 text-center py-4">Sem itens em foco identificáveis.</p>
            ) : (
              <div className="space-y-3">
                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-100 inline-block mb-1">
                  IA processou e atualizou estoque:
                </span>
                {visionResponse.map((det, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-emerald-50/30 border border-emerald-100/50 rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">{det.name}</h4>
                      <span className="text-[9px] text-gray-400">{det.category}</span>
                    </div>
                    <span className="text-xs font-extrabold text-[#1aa275] font-mono bg-white px-2 py-1 rounded border border-emerald-100 shadow-xs">
                      +{det.quantity} un
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Último scan panel from Image 5 */}
          <div id="latest-scans-card" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-500 text-[10px] uppercase tracking-wider mb-4 pb-2 border-b border-gray-50">
              Último scan
            </h3>

            <div className="space-y-3.5">
              {lastScanRecord.map((scan, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs border-b border-gray-50 last:border-b-0 pb-2.5 last:pb-0">
                  <span className="text-gray-700 font-medium font-sans">
                    {scan.name}
                  </span>
                  <span className="font-black text-[#1aa275] font-mono">
                    +{scan.quantity}
                  </span>
                </div>
              ))}
              <p className="text-[10px] text-gray-400 text-center font-sans pt-1">
                Adicionado ao BD e salvo em nuvem com sucesso.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
