'use client';

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare, Layers, ArrowRight, Database, Shield, Zap, Maximize2 } from 'lucide-react';
import ForceGraph from '../components/ForceGraph';

const ChatInterface = dynamic(() => import('../components/ChatInterface'), { ssr: false });
const CommunityExplorer = dynamic(() => import('../components/CommunityExplorer'), { ssr: false });

const NAV = [
  { id: 'chat', label: 'Intelligence Chat', icon: MessageSquare },
  { id: 'communities', label: 'Knowledge Clusters', icon: Layers },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');
  const [showIntro, setShowIntro] = useState(true);
  const [graphTriples, setGraphTriples] = useState<{ source: string; target: string; label?: string; type?: string; color?: string }[]>([]);
  const presentationRef = useRef<HTMLDivElement>(null);

  const handleGraphData = useCallback((triples: { source: string; target: string; label?: string; type?: string; color?: string }[]) => {
    setGraphTriples(triples);
  }, []);

  if (showIntro) {
    const boxStyle = {
      padding: '28px',
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      textAlign: 'left' as const,
      flex: 1,
      boxShadow: 'var(--shadow-sm)',
    };
    const titleStyle = {
      fontSize: 'clamp(14px, 1.3vw, 17px)',
      fontWeight: 700,
      fontFamily: 'var(--font-display)',
      marginBottom: '14px',
      color: 'var(--text-primary)',
    };
    const listStyle = {
      fontSize: 'clamp(12px, 1.1vw, 14px)',
      lineHeight: 1.7,
      color: 'var(--text-secondary)',
      margin: 0,
      paddingLeft: '18px',
    };
    const slideStyle = {
      minHeight: '100vh',
      scrollSnapAlign: 'start' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      padding: 'clamp(40px, 6vh, 72px) clamp(32px, 7vw, 100px)',
      position: 'relative' as const,
      justifyContent: 'center' as const,
    };
    const headingStyle = {
      fontSize: 'clamp(22px, 2.6vw, 36px)',
      fontWeight: 700,
      fontFamily: 'var(--font-display)',
      marginBottom: '10px',
      color: 'var(--text-primary)',
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    };
    const subtitleStyle = {
      fontSize: 'clamp(11px, 1vw, 14px)',
      color: 'var(--text-muted)',
      fontWeight: 500,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      marginBottom: 'clamp(28px, 4vh, 48px)',
    };

    return (
      <div style={{ height: '100vh', overflowY: 'auto', scrollSnapType: 'y mandatory', scrollBehavior: 'smooth', background: 'var(--bg-base)' }}>

        {/* ── SLIDE 1: The Problem ── */}
        <div style={slideStyle}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={headingStyle}>150+ Annual Business Reviews: An Untapped Intelligence Moat</h1>
            <p style={subtitleStyle}>The data already exists — it is simply not structured</p>
          </div>
          <div style={{ display: 'flex', gap: '14px', width: '100%', alignItems: 'stretch' }}>

            <div style={boxStyle}>
              <h3 style={titleStyle}>The Fragmentation Challenge</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}>150+ high-signal BRs per year from direct client engagement</li>
                <li style={{ marginBottom: '12px' }}>Data lives in static PDFs, isolated slide decks, personal notes</li>
                <li>Cross-client context permanently lost post-presentation</li>
              </ul>
            </div>

            <ArrowRight size={26} color="var(--text-muted)" style={{ flexShrink: 0, alignSelf: 'center' }} />

            <div style={boxStyle}>
              <h3 style={titleStyle}>The Structural Opportunity</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}>Proprietary client insight = our true competitive moat</li>
                <li style={{ marginBottom: '12px' }}>Aggregating demand signals reveals predictive macro shifts</li>
                <li>Enables precise, data-backed commercial positioning</li>
              </ul>
            </div>

            <ArrowRight size={26} color="var(--accent-main)" style={{ flexShrink: 0, alignSelf: 'center' }} />

            <div style={{ ...boxStyle, border: '2px solid var(--accent-main)', background: 'rgba(230,81,0,0.02)' }}>
              <h3 style={titleStyle}><Database size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />Enterprise AI Strategy Graph</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '12px' }}>A private, searchable database of all our Business Reviews</li>
                <li style={{ marginBottom: '12px' }}>Teams ask questions in plain English — exactly like ChatGPT</li>
                <li><strong>Why not just ChatGPT?</strong> Even with SharePoint access, ChatGPT cannot semantically map relationships across proprietary documents or surface cross-client intelligence</li>
              </ul>
            </div>

          </div>
          <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            SCROLL DOWN ↓
          </div>
        </div>

        {/* ── SLIDE 2: Use Cases ── */}
        <div style={slideStyle}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={headingStyle}>Deeper Client Understanding → Greater Wallet Penetration</h1>
            <p style={subtitleStyle}>Three high-impact applications for commercial teams</p>
          </div>
          <div style={{ display: 'flex', gap: '20px', width: '100%', marginBottom: '20px' }}>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Business Development</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '10px' }}>New prospect meeting → query all past BRs in sector → arrive with pinpointed pain points</li>
                <li style={{ marginBottom: '10px' }}>Client scope hesitation → surface accounts with same constraint → propose validated solution</li>
                <li>Cross-referenced client insight → drives shared wallet penetration, not assumptions</li>
              </ul>
            </div>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Commercial Leadership</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '10px' }}>"What's slowing fleet electrification?" → instant, data-backed macro view</li>
                <li style={{ marginBottom: '10px' }}>Replace delayed anecdotal reports → with unified demand signals extracted from 150+ BRs</li>
                <li>Spot emerging themes across portfolio → before competitors detect the pattern</li>
              </ul>
            </div>
            <div style={boxStyle}>
              <h3 style={titleStyle}>Compounding Intelligence</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '10px' }}>Each new BR ingested → enriches the entire network's accuracy</li>
                <li>Growing proprietary data volume → creates a knowledge barrier no competitor can replicate</li>
              </ul>
            </div>
          </div>
          <div style={{ padding: '18px 24px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderLeft: '4px solid var(--text-primary)', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Zap size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--text-primary)' }} />
            <div>
              <span style={{ fontWeight: 700, fontSize: 'clamp(12px, 1.1vw, 14px)', color: 'var(--text-primary)' }}>Why now?&nbsp;&nbsp;</span>
              <span style={{ fontSize: 'clamp(12px, 1.1vw, 14px)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>AI infrastructure to securely structure private, qualitative data at scale is enterprise-ready for the first time. Every BR we delay recording is intelligence permanently forfeited.</span>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            SCROLL DOWN ↓
          </div>
        </div>

        {/* ── SLIDE 3: The Sandbox ── */}
        <div style={slideStyle}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={headingStyle}>Proving the Architecture: The Intelligence Sandbox</h1>
            <p style={subtitleStyle}>Built on public data to demonstrate what becomes possible with private data</p>
          </div>
          <div style={{ display: 'flex', gap: '0', width: '100%', alignItems: 'stretch' }}>

            <div style={{ ...boxStyle, background: 'var(--bg-panel)' }}>
              <div style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--border)', borderRadius: '24px', fontSize: '10px', fontWeight: 700, marginBottom: '14px', letterSpacing: '0.06em' }}>PHASE 1: PROOF OF CONCEPT</div>
              <h3 style={titleStyle}>Semiconductor Sandbox <span style={{ fontWeight: 400, opacity: 0.6, fontSize: '0.8em' }}>(Demo Sample)</span></h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '10px' }}><strong>What:</strong> Public semiconductor earnings ingested into the same AI engine</li>
                <li style={{ marginBottom: '10px' }}><strong>Why semiconductor:</strong> Dense, technical, non-uniform — the hardest stress test for the architecture</li>
                <li><strong>Result:</strong> Structured insight automatically extracted from 100+ complex filings</li>
              </ul>
            </div>

            {/* Connector 1 → 2 */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', flexShrink: 0 }}>
              <div style={{ width: '28px', height: '2px', background: 'var(--el-blue-mist)' }} />
              <div style={{ width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '9px solid var(--el-blue-mist)' }} />
            </div>

            {/* Box 2: Required Enablers — same bg as Box 1 */}
            <div style={{ ...boxStyle, flex: 1, background: 'var(--bg-panel)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(25,46,68,0.07)', color: 'var(--el-navy)', borderRadius: '24px', fontSize: '10px', fontWeight: 700, marginBottom: '14px', letterSpacing: '0.06em' }}>
                <Shield size={10} />REQUIRED ENABLERS
              </div>
              <h3 style={titleStyle}>What needs to happen first</h3>
              <ol style={{ ...listStyle, paddingLeft: '20px' }}>
                <li style={{ marginBottom: '14px' }}>
                  <strong>IT Permission</strong><br />
                  <span style={{ fontSize: 'clamp(11px, 1vw, 13px)', color: 'var(--el-slate)' }}>Formal approval to run an ingestion pipeline on client-adjacent data</span>
                </li>
                <li style={{ marginBottom: '14px' }}>
                  <strong>Cloud Integration</strong><br />
                  <span style={{ fontSize: 'clamp(11px, 1vw, 13px)', color: 'var(--el-slate)' }}>Connect AI engine to Element's existing cloud infrastructure and document storage</span>
                </li>
                <li>
                  <strong>Greenlights to Record Business Reviews</strong><br />
                  <span style={{ fontSize: 'clamp(11px, 1vw, 13px)', color: 'var(--el-slate)' }}>Establish policy to systematically capture BR sessions as structured data</span>
                </li>
              </ol>
            </div>

            {/* Connector 2 → 3 */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', flexShrink: 0 }}>
              <div style={{ width: '28px', height: '2px', background: 'var(--el-teal)' }} />
              <div style={{ width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '9px solid var(--el-teal)' }} />
            </div>

            {/* Box 3: Target State */}
            <div style={{ ...boxStyle, flex: 1, border: '2px solid var(--el-teal)', background: '#fff', boxShadow: '0 12px 28px rgba(0,215,210,0.12)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: 'rgba(0,215,210,0.1)', color: 'var(--el-navy)', borderRadius: '24px', fontSize: '10px', fontWeight: 700, marginBottom: '14px', letterSpacing: '0.06em' }}>
                <Database size={10} />TARGET END-STATE
              </div>
              <h3 style={titleStyle}>Corporate Memory Bank</h3>
              <ul style={listStyle}>
                <li style={{ marginBottom: '10px' }}>Ask any business question in plain English → system scans all 150+ BRs instantly → structured, sourced answer returned</li>
                <li style={{ marginBottom: '10px' }}>No spreadsheets. No digging. No guesswork.</li>
                <li><em>"Which clients face EV delay risk due to infrastructure?"</em><br />→ Pinpoint account map. In seconds.</li>
              </ul>
            </div>

          </div>

          <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)' }}>
            <button
              onClick={() => {
                setShowIntro(false);
              }}
              style={{ padding: '14px 36px', fontSize: '15px', fontWeight: 600, background: 'var(--el-navy)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 8px 20px rgba(25,46,68,0.25)', letterSpacing: '0.04em' }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Initialize Demo →
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
                <MessageSquare size={16} color="var(--el-teal)" />
                <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Semiconductor Intelligence Database</span>
              </div>
            )}
            {activeTab === 'communities' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--el-teal)" />
                <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Knowledge Clusters</span>
              </div>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => {
                setShowIntro(true);
                // After state update, scroll snap to slide 3 (the sandbox slide)
                setTimeout(() => {
                  const container = document.querySelector('[style*="scrollSnapType"]') as HTMLElement;
                  if (container) {
                    const slides = container.querySelectorAll('[style*="scrollSnapAlign"]');
                    const slide3 = slides[2] as HTMLElement;
                    if (slide3) slide3.scrollIntoView({ behavior: 'instant' });
                  }
                }, 50);
              }}
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
          padding: activeTab === 'chat' ? '0' : '24px 32px',
        }}>
          {/* Chat layout: chat pane + graph pane side by side, always mounted */}
          <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', height: '100%', width: '100%', flexDirection: 'row' }}>
            {/* Chat pane */}
            <div style={{ flex: graphTriples.length > 0 ? '0 0 55%' : '1 1 100%', minWidth: 0, height: '100%', overflow: 'hidden', transition: 'flex-basis 0.3s ease' }}>
              <ChatInterface onGraphData={handleGraphData} />
            </div>
            {/* Graph pane — lives in page.tsx so it never unmounts with ChatInterface */}
            {graphTriples.length > 0 && (
              <>
                <div style={{ width: '1px', flexShrink: 0, background: 'var(--border)' }} />
                <div style={{ flex: '0 0 45%', minWidth: '300px', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', height: '100%' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <Maximize2 size={15} color="var(--accent-main)" />
                    <span style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'var(--font-display)' }}>Structural Relationship Map</span>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ForceGraph triples={graphTriples} />
                  </div>
                </div>
              </>
            )}
          </div>
          {activeTab === 'communities' && (
            <div style={{
              height: '100%',
              maxWidth: '900px',
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
