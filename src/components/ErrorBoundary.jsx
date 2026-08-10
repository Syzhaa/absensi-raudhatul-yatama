import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical UI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">gpp_maybe</span>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Sistem Sedang Gangguan</h1>
          <p className="text-gray-600 text-center mb-6">Komponen ini mengalami kendala teknis. Tim kami sedang menanganinya.</p>
          <button onClick={() => window.location.reload()} className="bg-gray-900 text-white px-6 py-2 rounded-xl">
            Muat Ulang Aplikasi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
