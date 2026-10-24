import React from 'react';
import ReactDOM from 'react-dom/client';
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
    console.error('React ErrorBoundary ধরা পড়েছে:', error, errorInfo);
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
    // ব্রাউজার ক্যাশ বাইপাস করে সম্পূর্ণ ফ্রেশ রিলোড
    window.location.href = window.location.origin + window.location.pathname + '?ts=' + Date.now();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
          <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-rose-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-black mb-4">
              ⚠️
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
              অ্যাপ্লিকেশনে সাময়িক সমস্যা হয়েছে
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-4">
              ব্রাউজারের ক্যাশ বা ডেটা অসঙ্গতির কারণে এই সমস্যা হতে পারে। নিচের বাটনে ক্লিক করে ক্যাশ পরিষ্কার করুন ও পুনরায় চালু করুন।
            </p>

            {this.state.error && (
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-rose-800 text-xs font-mono mb-5 overflow-auto max-h-36">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                ক্যাশ রিসেট ও রিলোড করুন
              </button>
              <button
                onClick={() => window.location.reload()}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
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
