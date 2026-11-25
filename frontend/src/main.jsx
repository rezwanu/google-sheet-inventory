import React from 'react';
import ReactDOM from 'react-dom/client';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import App from './App.jsx';
import './index.css';

// গ্লোবাল এরর বাউন্ডারি (Blank White Screen রোধ করার জন্য)
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.removeItem('pos_cart');
      localStorage.removeItem('pos_customer_ledger');
      const cust = localStorage.getItem('pos_customers');
      if (cust && !cust.trim().startsWith('[')) {
        localStorage.removeItem('pos_customers');
      }
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {}
    window.location.href = window.location.origin + window.location.pathname + '?ts=' + Date.now();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4 font-sans text-[#111111]">
          <div className="max-w-lg w-full bg-white rounded-lg p-6 border border-neutral-200/80">
            <div className="w-10 h-10 rounded-md bg-red-50 border border-red-200 text-[#B91C1C] flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold font-heading tracking-tight text-[#111111] mb-1.5">
              অ্যাপ্লিকেশনে সাময়িক ত্রুটি দেখা দিয়েছে
            </h2>
            <p className="text-xs sm:text-sm text-[#525252] mb-4">
              ব্রাউজারের ক্যাশ বা ডেটা অসঙ্গতির কারণে এই সমস্যা হতে পারে। নিচের বাটনে ক্লিক করে ক্যাশ রিসেট ও রিলোড করুন।
            </p>

            {this.state.error && (
              <div className="bg-red-50 p-3 rounded-md border border-red-200 text-[#B91C1C] text-xs font-mono mb-5 overflow-auto max-h-36">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 min-h-[44px] py-2 px-4 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ক্যাশ রিসেট ও রিলোড</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-[44px] py-2 px-4 bg-white hover:bg-neutral-100 text-[#111111] border border-neutral-200/80 text-xs font-medium rounded-md transition-colors cursor-pointer"
              >
                রিফ্রেশ
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
