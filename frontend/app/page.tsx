'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare, Layers, ArrowRight, Database, Shield, Zap } from 'lucide-react';

const ChatInterface = dynamic(() => import('../components/ChatInterface'), { ssr: false });
const CommunityExplorer = dynamic(() => import('../components/CommunityExplorer'), { ssr: false });

const NAV = [
  { id: 'chat', label: 'Intelligence Chat', icon: MessageSquare },
  { id: 'communities', label: 'Knowledge Clusters', icon: Layers },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');
  const [showIntro, setShowIntro] = useState(true);

  if (showIntro) {
    const boxStyle = {
      padding: '32px',
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      textAlign: 'left' as const,
      flex: 1,
      minHeight: '260px',
      boxShadow: 'var(--shadow-sm)'
    };
    const titleStyle = { fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '16px', color: 'var(--text-primary)' };
    const listStyle = { fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0, paddingLeft: '20px' };

    return (
      <div style={{ height: '100vh', overflowY: 'auto', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth', background: 'var(--bg-base)' }}>
        
        {/* Slide 1: Problem Statement */}
        <div style={{ height: '100vh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', padding: '80px 120px', position: 'relative', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '38px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '64px', color: 'var(--text-primary)', letterSpacing: '-0.02em', textAlign: 'center', lineHeight: 1.3 }}>
            150+ Annual Business Reviews: The Untapped Intelligence Moat
          </h1>
          <div style={{ display: 'flex', gap: '20px', width: '100%', alignItems: 'center' }}>
            
            <div style={boxStyle}>
              <h3 style={titleStyle}>1. The Fragmentation Challenge</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '16px' }}>150+ in-depth BRs conducted annually</li>
                <li style={{ marginBottom: '16px' }}>High-signal intelligence trapped in static PDFs & isolated slide decks</li>
                <li>Strategic cross-client context permanently lost post-presentation</li>
              </ul>
            </div>

            <ArrowRight size={32} color="var(--text-muted)" style={{ flexShrink: 0 }} />

            <div style={boxStyle}>
              <h3 style={titleStyle}>2. The Commercial Moat</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '16px' }}>Proprietary client intelligence = ultimate competitive barrier</li>
                <li style={{ marginBottom: '16px' }}>Aggregated macro-demands reveal predictive industry shifts</li>
                <li>Empowers commercial teams with hyper-specific, cross-referenced pitches</li>
              </ul>
            </div>

            <ArrowRight size={32} color="var(--accent-main)" style={{ flexShrink: 0 }} />

            <div style={{...boxStyle, border: '2px solid var(--accent-main)', background: 'rgba(230,81,0,0.03)' }}>
              <h3 style={titleStyle}><Database size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: '-2px' }}/>Enterprise AI Strategy Graph</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '16px' }}>Conversational RAG database mapping private workflows</li>
                <li style={{ marginBottom: '16px' }}><strong>Crucial Distinction:</strong> Public ChatGPT cannot securely index or mathematically map proprietary enterprise ecosystems</li>
                <li>Directly links unstructured narratives into an instantly queryable brain</li>
              </ul>
            </div>

          </div>
          <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', animation: 'bounce 2s infinite' }}>
            SCROLL DOWN ↓
          </div>
        </div>

        {/* Page 2: Use Cases */}
        <div style={{ height: '100vh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', padding: '80px 120px', position: 'relative', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '38px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '64px', color: 'var(--text-primary)', letterSpacing: '-0.02em', textAlign: 'center', lineHeight: 1.3 }}>
            Unlocking Shared Wallet Penetration & Macro-Clarity
          </h1>
          <div style={{ display: 'flex', gap: '32px', width: '100%', marginBottom: '40px' }}>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Business Development</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}>Rapidly cross-reference adjacent client precedents</li>
                <li style={{ marginBottom: '12px' }}>Surface intersecting structural pain points instantly</li>
                <li>Walk into engagements fully equipped to drive aggressive shared wallet penetration</li>
              </ul>
            </div>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Commercial Leadership</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}>Top-down view of programmatic demand shifts</li>
                <li style={{ marginBottom: '12px' }}>Mathematically unified insights across managed fleets</li>
                <li>Replace delayed anecdotal reporting with organically extracted macro-trends</li>
              </ul>
            </div>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Qualitative Data Flywheel</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}>Scale ingestion via standardized future BR recordings</li>
                <li>Compounding vector density exponentially widens our technical barrier-to-entry</li>
              </ul>
            </div>
          </div>
          <div style={{ padding: '32px 40px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderLeft: '4px solid var(--text-primary)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '8px', color: 'var(--text-primary)' }}><Zap size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }}/> Strategic Timing</h3>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: '900px' }}>The underlying graph architecture required to securely map highly qualitative, unstructured business narratives has officially reached enterprise maturity. We now possess the capability to systematically structure our most valuable asset.</p>
          </div>
          <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', animation: 'bounce 2s infinite' }}>
            SCROLL DOWN ↓
          </div>
        </div>

        {/* Page 3: The Sandbox Architecture */}
        <div style={{ height: '100vh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', padding: '80px 120px', position: 'relative', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '38px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '64px', color: 'var(--text-primary)', letterSpacing: '-0.02em', textAlign: 'center', lineHeight: 1.3 }}>
            Proving the Architecture: The Intelligence Sandbox
          </h1>
          <div style={{ display: 'flex', gap: '20px', width: '100%', alignItems: 'center' }}>
            
            {/* Left Box: The Proxy Demo */}
            <div style={{ ...boxStyle, background: 'var(--bg-panel)' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: 'var(--border)', borderRadius: '24px', fontSize: '11px', fontWeight: 700, marginBottom: '20px' }}>PHASE 1: PROOF OF CONCEPT</div>
              <h3 style={titleStyle}>Semiconductor Sandbox Demo</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}><strong>Setup:</strong> Modeled natively on public trading & earnings datasets</li>
                <li style={{ marginBottom: '12px' }}><strong>Goal:</strong> Validate the core GraphRAG engine's ability to safely extract complex, highly technical business logic</li>
              </ul>
            </div>
            
            <ArrowRight size={32} color="var(--text-muted)" style={{ flexShrink: 0 }} />

            {/* Middle Box: Barriers */}
            <div style={{ ...boxStyle, background: 'var(--bg-base)', border: '1px dashed var(--border)' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(0,0,0,0.05)', borderRadius: '24px', fontSize: '11px', fontWeight: 700, marginBottom: '20px' }}><Shield size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }}/>CURRENT STRUCTURAL BARRIERS</div>
              <h3 style={titleStyle}>Why not Element data immediately?</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}><strong>Infosec Compliance:</strong> Private client workflows require formal security clearances prior to experimental ingestion</li>
                <li style={{ marginBottom: '12px' }}><strong>Collection Velocity:</strong> Required historical pipeline of unified Business Review recordings must be activated</li>
              </ul>
            </div>

            <ArrowRight size={32} color="var(--accent-main)" style={{ flexShrink: 0 }} />

            {/* Right Box: Target State */}
            <div style={{ ...boxStyle, border: '2px solid var(--accent-main)', background: '#fff', boxShadow: '0 20px 40px rgba(230,81,0,0.08)' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(230,81,0,0.1)', color: 'var(--accent-main)', borderRadius: '24px', fontSize: '11px', fontWeight: 700, marginBottom: '20px' }}><Database size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }}/> THE TARGET END-STATE</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '16px', color: '#111' }}>True Element Strategy Graph</h3>
              <ul style={{ ...listStyle, color: '#444' }}>
                <li style={{ marginBottom: '12px' }}><strong>Resolution:</strong> A secured conversational network mapping genuine clients, fleets, and constraints</li>
                <li style={{ marginBottom: '12px' }}><strong>Sample Target Output:</strong> <em>"Which clients are actively delaying EV deployments due to local infrastructure?"</em> → Exact impact map generated instantly.</li>
              </ul>
            </div>

          </div>
          
          <div style={{ position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)' }}>
            <button 
              onClick={() => setShowIntro(false)} 
              style={{ padding: '16px 40px', fontSize: '16px', fontWeight: 600, background: 'var(--accent-main)', color: '#fff', border: 'none', borderRadius: '32px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 20px rgba(230,81,0,0.3)' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Initialize Semiconductor Demo →
            </button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: 'transparent',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px', padding: '0 8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '4px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'var(--accent-main)',
              color: 'white',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', fontFamily: 'var(--font-display)' }}>NABR</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Semiconductor Intelligence</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`nav-item${activeTab === id ? ' active' : ''}`}
              style={{ border: 'none', width: '100%', textAlign: 'left' }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

      </aside>

      {/* Main content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
        background: 'var(--bg-panel)'
      }}>
        {/* Top bar */}
        <div style={{
          height: '64px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          gap: '12px',
          flexShrink: 0,
          background: 'var(--bg-panel)',
        }}>
          <div style={{ flexShrink: 0 }}>
            {activeTab === 'chat' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} color="var(--accent-main)" />
                <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Intelligence Chat</span>
              </div>
            )}
            {activeTab === 'communities' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--accent-main)" />
                <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Knowledge Clusters</span>
              </div>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => setShowIntro(true)} 
              style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--border)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              ← Back to Presentation
            </button>
          </div>
        </div>

        {/* Content area */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          padding: '24px 32px',
        }}>
          {activeTab === 'chat' && (
            <div style={{ height: '100%', maxWidth: '1000px', margin: '0 auto' }}>
              <ChatInterface />
            </div>
          )}
          {activeTab === 'communities' && (
            <div style={{
              height: '100%',
              maxWidth: '1000px',
              margin: '0 auto',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '24px 32px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <Layers size={18} color="var(--accent-main)" />
                <span style={{ fontWeight: 600, fontSize: '16px', fontFamily: 'var(--font-display)' }}>Knowledge Clusters</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <CommunityExplorer />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
