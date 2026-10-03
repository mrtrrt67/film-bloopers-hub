import streamlit as st

def inject_global_styles():
    # Iniezione Meta Tag SEO
    st.markdown("""
        <script>
        const docHead = window.parent.document.head;
        window.parent.document.title = "Archivio Errori e Incongruenze Cinematografiche | Bloopers";
        </script>
    """, unsafe_allow_html=True)

    # Stili CSS Globali
    st.markdown("""
        <style>
            [data-testid="stMainBlockContainer"] { padding-top: 1rem !important; padding-bottom: 85px !important; }
            [data-testid="stSidebar"] { background-color: #0d1322; border-right: 1px solid #1f2937; }
            
            /* Cornice con effetto 3D profondo e rifinito per il logo */
            [data-testid="stSidebar"] [data-testid="stImage"] {
                background: linear-gradient(135deg, #131d31 0%, #0b1120 100%) !important;
                border: 1px solid #2a3b5c !important;
                border-radius: 14px !important;
                padding: 12px !important;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
                margin-bottom: 12px !important;
            }
            [data-testid="stSidebar"] [data-testid="stImage"] img {
                border-radius: 8px !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
            }

            [data-testid="stSidebar"] .block-container { padding-top: 0.4rem; padding-bottom: 2rem; overflow-x: hidden !important; }
            [data-testid="stSidebar"] div[data-testid="stVerticalBlock"] { gap: 0.25rem !important; }
            [data-testid="stSidebar"] div.stButton { margin-bottom: 2px !important; }
            [data-testid="stSidebar"] .stButton > button {
                background: transparent !important; border: none !important; box-shadow: none !important; color: #94a3b8 !important;
                display: flex !important; justify-content: flex-start !important; align-items: center !important;
                padding: 7px 12px !important; border-radius: 6px !important; font-weight: 500 !important; font-size: 13px !important; width: 100% !important; transition: all 0.2s ease !important; white-space: nowrap !important; min-height: 36px !important;
            }
            [data-testid="stSidebar"] .stButton > button div, [data-testid="stSidebar"] .stButton > button p, [data-testid="stSidebar"] .stButton > button span {
                text-align: left !important; justify-content: flex-start !important; margin: 0 !important; padding: 0 !important; width: 100% !important; display: flex !important; align-items: center !important; gap: 10px !important;
            }
            [data-testid="stSidebar"] .stButton > button:hover { background: rgba(59, 130, 246, 0.12) !important; color: #60a5fa !important; transform: translateX(3px); }
            [data-testid="stSidebar"] .stButton > button[kind="primary"] { background: rgba(37, 99, 235, 0.22) !important; border-left: 3px solid #3b82f6 !important; color: #93c5fd !important; font-weight: 600 !important; }
            .stApp { background-color: #070a10; background-image: radial-gradient(circle at 50% 0%, rgba(29, 78, 216, 0.18) 0%, transparent 55%), radial-gradient(circle at 100% 100%, rgba(15, 23, 42, 0.8) 0%, transparent 45%), linear-gradient(180deg, #0b1120 0%, #06090f 100%); background-attachment: fixed; }
            .main .stButton > button { border-radius: 8px !important; font-weight: 600 !important; font-size: 13px !important; padding: 8px 16px !important; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important; color: #ffffff !important; border: 1px solid #3b82f6 !important; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3) !important; transition: all 0.25s ease !important; width: 100% !important; }
            .main .stButton > button:hover { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important; box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45) !important; transform: translateY(-1px); }
            .stTextInput input, .stSelectbox select { border-radius: 8px; background-color: #131d31; color: #f8fafc; border: 1px solid #2a3b5c; }
            .footer-fixed { position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(11, 17, 32, 0.96); backdrop-filter: blur(8px); border-top: 1px solid #1f2937; padding: 10px 20px; text-align: center; color: #94a3b8; font-size: 11px; z-index: 99999; box-shadow: 0 -4px 15px rgba(0,0,0,0.5); }
        </style>
    """, unsafe_allow_html=True)