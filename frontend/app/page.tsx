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
          <h1 style={{ fontSize: '38px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '64px', color: 'var(--text-primary)', letterSpacing: '-0.02em', textAlign: 'center', lineHeight: 1.3 }}>
            150+ Annual Business Reviews Represent an Untapped Intelligence Moat
          </h1>
          <div style={{ display: 'flex', gap: '32px', width: '100%' }}>
            
            <div style={boxStyle}>
              <h3 style={titleStyle}>1. The Fragmentation Challenge</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '16px' }}>Element conducts over 150 in-depth Business Reviews annually, representing an untapped gold mine of qualitative client data.</li>
                <li style={{ marginBottom: '16px' }}>Currently, this high-signal intelligence is siloed across fragmented PDFs, slide decks, and localized team notes.</li>
                <li>Strategic, cross-client context is physically lost immediately after the presentation concludes.</li>
              </ul>
            </div>

            <div style={boxStyle}>
              <h3 style={titleStyle}>2. The Commercial Opportunity</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '16px' }}>Proprietary client intelligence is our ultimate competitive differentiator.</li>
                <li style={{ marginBottom: '16px' }}>Systematically aggregating macro-demands reveals hidden industry pain-points and shifting supply chain constraints.</li>
                <li>Commercial teams can intuitively surface cross-referenced insights to formulate hyper-specific, data-backed client solutions.</li>
              </ul>
            </div>

            <div style={{...boxStyle, border: '2px solid var(--accent-main)', background: 'rgba(230,81,0,0.03)' }}>
              <h3 style={titleStyle}>3. Enterprise AI Strategy Graph</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '16px' }}>An internal, conversational database specifically indexing our Business Reviews. Teams query it naturally, exactly like ChatGPT.</li>
                <li style={{ marginBottom: '16px' }}><strong>The RAG Distinction:</strong> Standard ChatGPT cannot securely access or mathematically map our private client ecosystem.</li>
                <li>This Retrieval-Augmented Generation (RAG) architecture natively links our unstructured, proprietary narratives into a secure corporate brain.</li>
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
            Unlocking Shared Wallet Penetration and Macro-Level Clarity
          </h1>
          <div style={{ display: 'flex', gap: '32px', width: '100%', marginBottom: '40px' }}>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Business Development</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '12px' }}>Commercial teams rapidly identify relevant precedents and intersecting client challenges.</p>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>By deeply understanding unique client constraints, teams can walk into engagements equipped to aggressively drive shared wallet penetration.</p>
            </div>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Senior Leadership Formations</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '12px' }}>Senior Leadership gains a top-down, mathematically unified view of shifting programmatic demands across the entire managed portfolio.</p>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>Identify emerging macro-trends organically rather than relying on delayed, anecdotal field reporting.</p>
            </div>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Qualitative Data Flywheel</h3>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '12px' }}>As we establish standardized data collection for future Business Review recordings, the intelligence ingestion scales.</p>
              <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>The denser the proprietary vector network becomes, the wider our competitive advantage grows.</p>
            </div>
          </div>
          <div style={{ padding: '32px 40px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderLeft: '4px solid var(--text-primary)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '8px', color: 'var(--text-primary)' }}>Strategic Timing</h3>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: '900px' }}>The underlying graph architecture required to securely map highly qualitative, unstructured business narratives has officially reached enterprise maturity. We now have the technical capability to systematically structure our most valuable asset.</p>
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
          <div style={{ display: 'flex', gap: '32px', width: '100%' }}>
            
            {/* Left Box: The Proxy Demo */}
            <div style={{ ...boxStyle, background: 'var(--bg-panel)' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: 'var(--border)', borderRadius: '24px', fontSize: '11px', fontWeight: 700, marginBottom: '20px' }}>PHASE 1: PROOF OF CONCEPT</div>
              <h3 style={titleStyle}>Semiconductor Demo Sandbox</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}><strong>The Proxy Setup:</strong> To demonstrate capability immediately, we built this demo sandbox using public Semiconductor industry datasets.</li>
                <li style={{ marginBottom: '12px' }}><strong>The Purpose:</strong> This validates that the core GraphRAG engine can successfully extract and relate highly technical, non-uniform business logic.</li>
              </ul>
            </div>
            
            {/* Middle Box: Barriers */}
            <div style={{ ...boxStyle, background: 'var(--bg-base)', border: '1px dashed var(--border)' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(0,0,0,0.05)', borderRadius: '24px', fontSize: '11px', fontWeight: 700, marginBottom: '20px' }}>THE CURRENT BARRIER</div>
              <h3 style={titleStyle}>Why not build on Element data today?</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}><strong>IT Infosec Clearances:</strong> Actual client data cannot be processed through experimental infrastructure without formal infosec pathways.</li>
                <li style={{ marginBottom: '12px' }}><strong>Data Collection Velocity:</strong> Historically, we have not mandated the recording or automated transcription of all Business Reviews. The raw data pipeline needs to be activated before it can be ingested.</li>
              </ul>
            </div>

            {/* Right Box: Target State */}
            <div style={{ ...boxStyle, border: '2px solid var(--accent-main)', background: '#fff', boxShadow: '0 20px 40px rgba(230,81,0,0.08)' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(230,81,0,0.1)', color: 'var(--accent-main)', borderRadius: '24px', fontSize: '11px', fontWeight: 700, marginBottom: '20px' }}>THE TARGET END-STATE</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '16px', color: '#111' }}>Enterprise AI Strategy Graph</h3>
              <ul style={{ ...listStyle, color: '#444' }}>
                <li style={{ marginBottom: '12px' }}><strong>Resolution:</strong> A secure, internal conversational interface natively mapping genuine Element clients, fleets, and demands.</li>
                <li style={{ marginBottom: '12px' }}><strong>Output Example:</strong> Senior Leadership queries "Which clients are actively delaying EV transitions due to infrastructure?", and receives a direct, sourced map of at-risk accounts.</li>
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
