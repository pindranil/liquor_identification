import React, { useState, useEffect } from 'react';
import {
  Wine,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  History,
  MapPin,
  Store,
  Tag,
  IndianRupee,
  Navigation
} from 'lucide-react';
import './App.css';

const SAMPLES = [
  "Glenfiddich 18 Single Malt Scotch Whisky",
  "Jack Daniel's Old No. 7 Tennessee Whiskey",
  "Red Bull Energy Drink 250ml",
  "Dom Pérignon Brut Champagne",
  "Old Monk XXX Rum",
  "Coca-Cola Zero Sugar",
  "Hendrick's Gin",
  "Starbucks Iced Caramel Macchiato"
];

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.101:8001/api/classify/';


export default function App() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  
  // Location state - default to Newtown, Kolkata
  const [locationText, setLocationText] = useState('Newtown, Kolkata');
  const [detectingLoc, setDetectingLoc] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setDetectingLoc(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const parts = [
              addr.suburb || addr.neighbourhood || addr.residential || addr.road,
              addr.subdistrict || addr.city_district || addr.county,
              addr.city || addr.town || addr.state_district || 'Kolkata'
            ].filter(Boolean);

            if (parts.length > 0) {
              setLocationText(parts.join(', '));
            }
          }
        } catch (e) {
          console.warn('Reverse geocode error:', e);
        } finally {
          setDetectingLoc(false);
        }
      },
      (err) => {
        console.warn('GPS denied or unavailable:', err);
        setDetectingLoc(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };


  useEffect(() => {
    detectLocation();
  }, []);

  const handleClassify = async (textToClassify = inputText) => {
    const text = textToClassify.trim();
    if (!text) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: text,
        location_name: locationText,
      };

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);

      // Add to search history
      setHistory(prev => [
        { text, result: data, timestamp: new Date().toLocaleTimeString() },
        ...prev.filter(item => item.text.toLowerCase() !== text.toLowerCase()).slice(0, 7)
      ]);
    } catch (err) {
      console.error('Classification error:', err);
      setError(err.message || 'Failed to connect to Django backend. Ensure backend is running on port 8001.');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (sample) => {
    setInputText(sample);
    handleClassify(sample);
  };

  const handleClear = () => {
    setInputText('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand-badge">
          <Wine size={16} />
          <span>Sommelier AI Classifier</span>
        </div>
        <h1 className="brand-title">LiquorIQ</h1>
        <p className="brand-subtitle">
          Instantly verify whether any product, beverage name, or text receipt item is an alcoholic liquor.
        </p>
      </header>

      {/* Main Grid */}
      <main className="main-grid">
        {/* Left Column: Input Form (Workspace Card) */}
        <section className="glass-card card-query">
          <div className="card-title">
            <Sparkles size={20} className="text-amber" style={{ color: '#d97706' }} />
            <span>Liquor Verification Query</span>
            <span className="card-header-tag" style={{ background: 'rgba(217, 119, 6, 0.2)', color: '#fbbf24' }}>Input Workspace</span>
          </div>

          {/* Editable Location Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '0.65rem',
            padding: '0.4rem 0.75rem',
            marginBottom: '0.75rem',
          }}>
            <Navigation size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>Location:</span>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="Type your exact area (e.g. Salt Lake, Park Street, Gariahat)..."
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e0f2fe',
                fontSize: '0.825rem',
                fontWeight: '600',
                width: '100%',
                outline: 'none'
              }}
            />
            <button
              onClick={detectLocation}
              disabled={detectingLoc}
              title="Auto Detect GPS / IP Location"
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                borderRadius: '0.4rem',
                padding: '0.2rem 0.5rem',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <MapPin size={12} />
              {detectingLoc ? 'Locating...' : 'Auto GPS'}
            </button>
          </div>

          <div className="input-group">
            <textarea
              id="liquor-input"
              className="liquor-textarea"
              placeholder="Enter beverage name, brand, cocktail, or bill item (e.g. 'Glenfiddich 12', 'Jack Daniel's', 'Red Bull', 'Old Monk')..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleClassify();
                }
              }}
            />
          </div>

          {/* Preset Sample Chips */}
          <div className="presets-section">
            <div className="presets-label">Quick Test Examples</div>
            <div className="chip-container">
              {SAMPLES.map((sample, idx) => (
                <button
                  key={idx}
                  className="sample-chip"
                  onClick={() => handlePresetClick(sample)}
                  disabled={loading}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="button-group">
            <button
              id="classify-btn"
              className="btn-primary"
              onClick={() => handleClassify()}
              disabled={loading || !inputText.trim()}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Analyzing with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Check Liquor Status</span>
                </>
              )}
            </button>

            {inputText && (
              <button
                id="clear-btn"
                className="btn-secondary"
                onClick={handleClear}
                disabled={loading}
              >
                <RotateCcw size={18} />
              </button>
            )}
          </div>
        </section>

        {/* Middle Column: Results Display (AI Hero Card) */}
        <section className={`glass-card card-analysis ${loading ? 'aura-processing-card' : ''}`}>
          <div className="card-title">
            <Wine size={20} style={{ color: '#fbbf24' }} />
            <span>Classification Analysis</span>
            <span className="card-header-tag" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fef08a' }}>Sommelier AI</span>
          </div>

          {error && (
            <div className="explanation-box" style={{ borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
              <div className="explanation-title" style={{ color: '#f87171' }}>
                <XCircle size={16} /> Backend Connection Error
              </div>
              <div className="explanation-text" style={{ color: '#fca5a5' }}>
                {error}
              </div>
            </div>
          )}

          {loading && (
            <div className="aura-container">
              <Sparkles size={44} className="aura-star-icon" />
              <div className="aura-loading-text">
                Analyzing Beverage with AI Sommelier...
              </div>
              <div className="aura-subtext">
                Evaluating beverage taxonomy, ABV & Kolkata market prices
              </div>

              <div className="aura-skeleton-box">
                <div className="aura-skeleton-line" style={{ width: '90%' }} />
                <div className="aura-skeleton-line" style={{ width: '75%' }} />
                <div className="aura-skeleton-line" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="empty-state">
              <Wine className="empty-icon" />
              <h3>No Beverage Analyzed Yet</h3>
              <p>Type a name in the text area or click one of the quick test examples to perform AI liquor classification.</p>
            </div>
          )}

          {!loading && result && (
            <div className="animate-fade-in">
              {/* Main Result Banner */}
              <div className={`result-status-banner ${result.is_liquor ? 'is-liquor' : 'not-liquor'}`}>
                <div className="status-main">
                  <div className="status-icon-wrapper">
                    {result.is_liquor ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                  </div>
                  <div>
                    <div className="status-title">
                      {result.is_liquor ? 'CONFIRMED LIQUOR' : 'NON-ALCOHOLIC / NOT A LIQUOR'}
                    </div>
                    <div className="status-subtitle">
                      Query: "{result.query_text}"
                    </div>
                  </div>
                </div>

                <div className="confidence-pill">
                  {result.confidence} Confidence
                </div>
              </div>

              {/* Detail Metrics */}
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">Beverage Category</div>
                  <div className="detail-value">{result.category || 'N/A'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Liquor Type</div>
                  <div className="detail-value">{result.liquor_type || 'N/A'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Detected Brand</div>
                  <div className="detail-value">{result.detected_brand || 'None Detected'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Approx. ABV</div>
                  <div className="detail-value" style={{ color: result.is_liquor ? '#fbbf24' : '#94a3b8' }}>
                    {result.approx_abv || (result.is_liquor ? '~40%' : '0%')}
                  </div>
                </div>
              </div>

              {/* Price in Kolkata */}
              {result.approx_price_kolkata && result.approx_price_kolkata !== 'N/A' && (
                <div className="detail-item" style={{ marginBottom: '0.75rem', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)' }}>
                  <div className="detail-label" style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <IndianRupee size={12} /> Kolkata Est. MRP / Retail Price
                  </div>
                  <div className="detail-value" style={{ color: '#34d399', fontSize: '1rem', fontWeight: '700' }}>
                    {result.approx_price_kolkata}
                  </div>
                </div>
              )}

              {/* AI Sommelier Explanation */}
              <div className="explanation-box">
                <div className="explanation-title">
                  <Sparkles size={16} /> Sommelier AI Analysis
                </div>
                <div className="explanation-text">
                  {result.explanation}
                </div>
              </div>

              {/* Nearby Stores in Location */}
              {result.nearby_stores_kolkata && (
                <div className="explanation-box" style={{ borderLeftColor: '#38bdf8', background: 'rgba(14, 165, 233, 0.08)' }}>
                  <div className="explanation-title" style={{ color: '#38bdf8' }}>
                    <MapPin size={15} /> Nearby Stores & Outlets near {locationText.split(',')[0]}
                  </div>
                  <div className="explanation-text" style={{ color: '#e0f2fe', fontSize: '0.825rem' }}>
                    {result.nearby_stores_kolkata}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Column: Recent Analysis History (Timeline Drawer Card) */}
        <section className="glass-card card-history">
          <div className="card-title">
            <History size={18} style={{ color: '#94a3b8' }} />
            <span>Analysis History ({history.length})</span>
            <span className="card-header-tag" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' }}>Timeline</span>
          </div>

          {history.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
              <History className="empty-icon" style={{ fontSize: '2.2rem', opacity: 0.3 }} />
              <h4 style={{ color: '#94a3b8', fontWeight: '500', marginBottom: '0.25rem' }}>No History Yet</h4>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Analyzed beverages will appear here for quick reference.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className={`history-item ${item.result.is_liquor ? 'history-item-liquor' : 'history-item-nonalc'}`}
                  onClick={() => {
                    setInputText(item.text);
                    setResult(item.result);
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ 
                        color: item.result.is_liquor ? '#34d399' : '#f87171',
                        fontSize: '0.725rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        padding: '0.12rem 0.45rem',
                        borderRadius: '4px',
                        background: item.result.is_liquor ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                      }}>
                        {item.result.is_liquor ? '🥃 Liquor' : '🥤 Non-Alc'}
                      </span>
                      <span style={{ fontSize: '0.725rem', color: '#64748b' }}>{item.timestamp}</span>
                    </div>

                    <strong style={{ color: '#f1f5f9', fontSize: '0.925rem', wordBreak: 'break-word', marginTop: '0.25rem' }}>
                      {item.text}
                    </strong>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {item.result.category || 'N/A'} {item.result.approx_abv ? `• ${item.result.approx_abv}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
