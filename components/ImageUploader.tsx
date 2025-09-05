import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone, FileRejection, DropzoneOptions } from 'react-dropzone';

interface ImageUploaderProps {
  onImageUpload: (files: File[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  uploadText?: string;
  uploadSubtext?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  customButtonStyle?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageUpload, 
  multiple = true, 
  maxFiles = 5,
  uploadText = "Arraste e cole fotos aqui",
  uploadSubtext = "Até 5 arquivos (PNG, JPG)",
  icon,
  disabled = false,
  customButtonStyle,
}) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (disabled) return;
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageFiles = Array.from(items)
        .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
        .map(item => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (imageFiles.length > 0) {
        event.preventDefault();

        if (!multiple && imageFiles.length > 1) {
             setError(`Você só pode enviar 1 foto.`);
             return;
        }

        if (maxFiles > 0 && imageFiles.length > maxFiles) {
          setError(`Você só pode enviar no máximo ${maxFiles} foto(s).`);
          return;
        }

        setError(null);
        onImageUpload(imageFiles);
      }
    };

    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [onImageUpload, multiple, maxFiles, disabled]);


  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (disabled) return;
    setError(null);
    if (rejectedFiles.length > 0) {
      if (rejectedFiles[0].errors[0].code === 'too-many-files') {
        setError(`Você só pode enviar no máximo ${maxFiles} foto(s).`);
      } else {
        setError('Arquivo inválido. Por favor, envie uma imagem (JPEG, PNG).');
      }
      return;
    }
    if (acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles);
    }
  }, [onImageUpload, maxFiles, disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    // workaround para tipagem do DropzoneOptions
    ...( {
      onDrop,
      accept: {
        'image/jpeg': ['.jpeg', '.jpg'],
        'image/png': ['.png']
      },
      multiple,
      maxFiles,
    } as unknown as DropzoneOptions )
  });

  // Custom input props for mobile camera access
  const getCustomInputProps = () => {
    const baseProps = getInputProps();
    return {
      ...baseProps,
      capture: "environment" as const, // Prioriza câmera traseira
      accept: "image/*", // Aceita todos os tipos de imagem
    };
  };

  const defaultIcon = (
    <svg className="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h10v18H2zM12 3h10v9h-10z"/>
        <path d="M12 12h10v9h-10z"/>
        <path d="M5 6.5h4"/>
        <path d="M5 9.5h4"/>
        <path d="M15 6.5h4"/>
        <path d="M15 9.5h4"/>
        <path d="M15 15.5h4"/>
        <path d="M15 18.5h4"/>
    </svg>
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {customButtonStyle ? (
        <div>
          <input {...getCustomInputProps()} id="file-input-custom" style={{ display: 'none' }} />
          <button
            onClick={() => !disabled && (document.getElementById('file-input-custom') as HTMLInputElement)?.click()}
            className={customButtonStyle}
            disabled={disabled}
          >
            {uploadText}
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`mt-8 flex justify-center rounded-xl border border-slate-300 bg-white px-6 py-10 transition-colors ${
            isDragActive ? 'border-orange-500 bg-orange-50 border-2' : ''
          } ${disabled ? 'cursor-not-allowed bg-slate-100 opacity-60' : 'cursor-pointer hover:border-orange-400'}`}
        >
          <input {...getCustomInputProps()} />
          <div className="text-center">
            {icon || defaultIcon}
            <div className="mt-4 text-sm leading-6 text-slate-600">
              <p>
                  <span className={`font-semibold ${!disabled && 'text-orange-600 hover:text-orange-500'}`}>
                  {disabled ? 'Limite diário atingido' : uploadText}
                  </span>
                  {!disabled && <span className="pl-1">ou clique para selecionar</span>}
              </p>
            </div>
            <p className="text-xs leading-5 text-slate-500">{uploadSubtext}</p>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600 text-center">{error}</p>}
    </div>
  );
};

export default ImageUploader;
