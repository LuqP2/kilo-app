import React from 'react';
import logoSvg from '../src/assets/logo.svg';
import './LogoUploadButton.css';

interface Props {
  onClick: () => void;
}

export const LogoUploadButton: React.FC<Props> = ({ onClick }) => (
  <button className="uploadButton" onClick={onClick}>
    <div className="logoContainer">
      <img src={logoSvg} alt="Upload" />
    </div>
  </button>
);
