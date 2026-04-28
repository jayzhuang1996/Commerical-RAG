'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare, Layers, BarChart2, Github } from 'lucide-react';

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
          <h1 style={{ fontSize: '44px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '64px', color: 'var(--text-primary)', letterSpacing: '-0.02em', textAlign: 'center' }}>
            The Strategic Context
          </h1>
          <div style={{ display: 'flex', gap: '32px', width: '100%' }}>
            
            <div style={boxStyle}>
              <h3 style={titleStyle}>1. The Problem</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '16px' }}>Element conducts 150+ in-depth Business Reviews annually, harvesting high-signal qualitative client data.</li>
                <li style={{ marginBottom: '16px' }}>This proprietary data is siloed in fragmented PDFs, isolated slide decks, and localized notes.</li>
                <li>Strategic cross-client context is physically lost post-presentation.</li>
              </ul>
            </div>

            <div style={boxStyle}>
              <h3 style={titleStyle}>2. The Opportunity</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '16px' }}>Proprietary client intelligence is our ultimate competitive moat against rivals.</li>
                <li style={{ marginBottom: '16px' }}>Aggregating macro-demands reveals hidden industry pain-points and shifts.</li>
                <li>Senior leadership and Hunter teams can systematically leverage cross-referenced intel to immediately pitch hyper-specific solutions.</li>
              </ul>
            </div>

            <div style={{...boxStyle, border: '2px solid var(--accent-main)', background: 'rgba(230,81,0,0.03)' }}>
              <h3 style={titleStyle}>3. The Solution</h3>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--accent-main)', marginBottom: '12px' }}>Enterprise AI Strategy Graph</h4>
              <ul style={listStyle}>
                <li style={{ marginBottom: '16px' }}>An AI-native Knowledge Database leveraging RAG (Retrieval-Augmented Generation) infrastructure.</li>
                <li style={{ marginBottom: '16px' }}>Mathematically ingests and universally links unstructured proprietary narratives.</li>
                <li>Transforms dead presentation files into an instantly queryable, living strategic brain.</li>
              </ul>
            </div>

          </div>
          <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', animation: 'bounce 2s infinite' }}>
            SCROLL DOWN ↓
          </div>
        </div>

        {/* Page 2: Use Cases & Urgency */}
        <div style={{ height: '100vh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', padding: '80px 120px', position: 'relative', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '44px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '64px', color: 'var(--text-primary)', letterSpacing: '-0.02em', textAlign: 'center' }}>
            Deployment Use Cases
          </h1>
          <div style={{ display: 'flex', gap: '32px', width: '100%', marginBottom: '40px' }}>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Business Development Hunter Copilot</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '12px' }}>Hunters instantly find relevant stories and cross-reference common pain-points that similar clients face.</p>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>Walk into net-new pitches with unparalleled, data-backed insights.</p>
            </div>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Commercial Leadership Command</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '12px' }}>SVPs gain a top-down, mathematically derived view of shifting demands across the entire managed fleet portfolio.</p>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>Identify macro-trends organically instead of relying on anecdotal reporting.</p>
            </div>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Qualitative Data Flywheel</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '12px' }}>The more Business Reviews we ingest, the denser the vector network becomes.</p>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>The intelligence scales mathematically, cementing Element's proprietary barrier to entry.</p>
            </div>
          </div>
          <div style={{ padding: '40px', background: 'var(--text-primary)', color: 'var(--bg-base)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '16px' }}>Why Now? The Cost of Inaction</h3>
            <p style={{ fontSize: '17px', lineHeight: 1.7, opacity: 0.9, maxWidth: '900px' }}>Every quarter we operate without this data pipeline is a quarter where thousands of unstructured insights are permanently left on the table. The technology to organically structure this data is finally viable today. If we do not build this proprietary intelligence layer, a competitor will.</p>
          </div>
          <div style={{ position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', animation: 'bounce 2s infinite' }}>
            SCROLL DOWN ↓
          </div>
        </div>

        {/* Page 3: The Sandbox Architecture */}
        <div style={{ height: '100vh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', padding: '80px 120px', position: 'relative', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '44px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '64px', color: 'var(--text-primary)', letterSpacing: '-0.02em', textAlign: 'center' }}>
            The Demonstration Architecture
          </h1>
          <div style={{ display: 'flex', gap: '32px', width: '100%' }}>
            
            {/* Left Box: The Proxy Demo */}
            <div style={{ ...boxStyle, background: 'var(--bg-panel)' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: 'var(--border)', borderRadius: '24px', fontSize: '11px', fontWeight: 700, marginBottom: '20px' }}>PHASE 1: PROOF OF CONCEPT</div>
              <h3 style={titleStyle}>Semiconductor Demo Sandbox</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}><strong>The Proxy Setup:</strong> We built this initial demo using public Semiconductor public trading filings.</li>
                <li style={{ marginBottom: '12px' }}><strong>The Goal:</strong> To prove definitively that the AI engine can mathematically extract and organize vast amounts of highly technical, unstructured data organically.</li>
              </ul>
            </div>
            
            {/* Middle Box: Barriers */}
            <div style={{ ...boxStyle, background: 'var(--bg-base)', border: '1px dashed var(--border)' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(0,0,0,0.05)', borderRadius: '24px', fontSize: '11px', fontWeight: 700, marginBottom: '20px' }}>THE STRUCTURAL BARRIER</div>
              <h3 style={titleStyle}>Why not build on true Element data?</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}><strong>IT Infosec Permissions:</strong> Proprietary Business Review forms are locked behind strict infosec compliance.</li>
                <li style={{ marginBottom: '12px' }}><strong>Immature Pipeline:</strong> There is no existing, compliant unified pipeline dumping Element Client BRs to experiment on freely.</li>
              </ul>
            </div>

            {/* Right Box: Target State */}
            <div style={{ ...boxStyle, border: '2px solid var(--accent-main)', background: '#fff', boxShadow: '0 20px 40px rgba(230,81,0,0.08)' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(230,81,0,0.1)', color: 'var(--accent-main)', borderRadius: '24px', fontSize: '11px', fontWeight: 700, marginBottom: '20px' }}>THE TARGET END-STATE</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '16px', color: '#111' }}>Real Element Database</h3>
              <ul style={{ ...listStyle, color: '#444' }}>
                <li style={{ marginBottom: '12px' }}><strong>Resolution:</strong> A private Knowledge Graph explicitly mapping Element clients, fleets, and demands.</li>
                <li style={{ marginBottom: '12px' }}><strong>Output Example:</strong> An SVP queries "Which clients are delaying EV transition due to infrastructure?", and receives an exact, sourced map of specific accounts.</li>
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
