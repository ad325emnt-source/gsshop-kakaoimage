import streamlit as st
import requests
import pandas as pd
import io
import json

# ==========================================
# 1. Streamlit Page Configuration & Theme
# ==========================================
st.set_page_config(
    page_title="카카오모먼트 광고 소재 세팅값 조회 시스템",
    page_icon="🟡",
    layout="wide"
)

# Custom Styling (Dark & Kakao Yellow Theme)
st.markdown("""
    <style>
    .main { background-color: #0b0f19; }
    h1, h2, h3 { color: #f1f5f9; font-family: 'Noto Sans KR', sans-serif; }
    .stButton>button {
        background-color: #FEE500 !important;
        color: #191919 !important;
        font-weight: bold !important;
        border-radius: 8px !important;
        border: none !important;
        padding: 10px 24px !important;
    }
    .stButton>button:hover {
        background-color: #ebd400 !important;
        color: #191919 !important;
    }
    </style>
""", unsafe_allow_html=True)

API_ENDPOINT = "https://cuyr21hbxd.execute-api.ap-northeast-2.amazonaws.com/prod/61258/moment-creative-info"

def unwrap_response(data):
    if isinstance(data, dict) and "body" in data:
        body = data["body"]
        if isinstance(body, str):
            try:
                return json.loads(body)
            except Exception:
                return body
        return body
    return data

def normalize_url(url):
    if not url:
        return ""
    if isinstance(url, str) and url.startswith("//"):
        return "https:" + url
    return url

def fetch_info(ad_group_id, api_key):
    response = requests.get(
        API_ENDPOINT,
        params={"id": ad_group_id},
        headers={"x-api-key": api_key},
        timeout=15
    )
    if response.status_code == 403:
        raise ValueError("API Key가 없거나 잘못되었습니다 (403 Forbidden).")
    response.raise_for_status()
    return unwrap_response(response.json())

# ==========================================
# 2. Header & Sidebar
# ==========================================
st.title("🟡 카카오모먼트 광고 소재 세팅값 조회 시스템")
st.caption("광고그룹 ID를 입력하여 세팅값, 이미지, 문구를 조회하고 엑셀(.xlsx)로 다운로드하세요.")

st.sidebar.header("⚙️ API Key 설정")
api_key = st.sidebar.text_input("x-api-key 입력", type="password", help="제공받은 x-api-key를 입력하세요.")

if not api_key:
    st.warning("⚠️ 좌측 사이드바에서 **x-api-key**를 먼저 입력해 주세요.")
    st.stop()

# ==========================================
# 3. Search Inputs
# ==========================================
tab1, tab2 = st.tabs(["🔍 단일 ID 조회", "📦 다중 ID 대량 조회"])

data_results = []

with tab1:
    col1, col2 = st.columns([3, 1])
    with col1:
        single_id = st.text_input("광고그룹 ID 입력", placeholder="예: 4475444 또는 4412053")
    with col2:
        st.write("")
        st.write("")
        btn_single = st.button("세팅값 불러오기", key="single_btn")
    
    if btn_single:
        if not single_id.strip():
            st.error("광고그룹 ID를 입력해주세요.")
        else:
            with st.spinner("데이터 조회 중..."):
                try:
                    res = fetch_info(single_id.strip(), api_key)
                    data_results = [res]
                    st.success("✓ 조회가 완료되었습니다.")
                except Exception as e:
                    st.error(f"조회 실패: {e}")

with tab2:
    multi_input = st.text_area("여러 광고그룹 ID 입력 (줄바꿈 또는 쉼표 구분)", placeholder="4475444\n4412053")
    btn_multi = st.button("대량 세팅값 불러오기", key="multi_btn")

    if btn_multi:
        ids = [i.strip() for i in multi_input.replace(',', '\n').split('\n') if i.strip()]
        if not ids:
            st.error("광고그룹 ID를 입력해주세요.")
        else:
            progress_bar = st.progress(0)
            with st.spinner("대량 데이터 조회 중..."):
                for idx, item_id in enumerate(ids):
                    try:
                        res = fetch_info(item_id, api_key)
                        data_results.append(res)
                    except Exception as e:
                        st.warning(f"ID {item_id} 조회 실패: {e}")
                    progress_bar.progress((idx + 1) / len(ids))
            if data_results:
                st.success(f"✓ 총 {len(data_results)}건 조회가 완료되었습니다.")

# ==========================================
# 4. Display Results & Excel Export (.xlsx)
# ==========================================
if data_results:
    st.markdown("---")
    st.subheader("📋 조회 결과 데이터")

    summary_rows = []
    item_rows = []

    for raw in data_results:
        msg = raw.get("messageElement") or {}
        img = msg.get("image") or {}
        items = msg.get("itemAssetGroups") or raw.get("items") or []

        main_img_url = normalize_url(img.get("url") or (items[0].get("imageUrl") if items and isinstance(items[0], dict) else None))

        summary_rows.append({
            "creativeId": raw.get("creativeId") or msg.get("id") or raw.get("messageAdId") or "",
            "name": raw.get("name") or msg.get("name") or "",
            "adGroupId": raw.get("adGroupId") or "",
            "format": raw.get("format") or msg.get("creativeFormat") or raw.get("type") or "",
            "config": raw.get("config") or "",
            "systemConfig": raw.get("systemConfig") or "",
            "statusDescription": raw.get("statusDescription") or "",
            "messageElement.id": msg.get("id") or "",
            "adAccountId": msg.get("adAccountId") or "",
            "profileId": msg.get("profileId") or "",
            "title": msg.get("title") or "",
            "description": msg.get("description") or raw.get("description") or "",
            "fileSize": img.get("fileSize") or "",
            "url": main_img_url,
            "fileName": img.get("fileName") or "",
            "imageWidth": img.get("imageWidth") or "",
            "imageHeight": img.get("imageHeight") or "",
            "mimeType": img.get("mimeType") or ""
        })

        for item in items:
            if isinstance(item, dict):
                item_img = item.get("image", {}).get("url") if isinstance(item.get("image"), dict) else (item.get("imageUrl") or item.get("image_url"))
                item_rows.append({
                    "adGroupId": raw.get("adGroupId") or "",
                    "creativeId": raw.get("creativeId") or msg.get("id") or "",
                    "name": raw.get("name") or msg.get("name") or "",
                    "ordering": item.get("ordering", ""),
                    "title": item.get("title") or "",
                    "priceAmount": item.get("priceAmount") or item.get("price_amount") or "",
                    "discountedPriceAmount": item.get("discountedPriceAmount") or item.get("discounted_price_amount") or "",
                    "currency": item.get("priceCurrencyCode") or item.get("currency") or "",
                    "mobileLandingUrl": item.get("mobileLandingUrl") or item.get("landing_url") or "",
                    "imageUrl": normalize_url(item_img)
                })

    df_summary = pd.DataFrame(summary_rows)
    st.dataframe(df_summary, use_container_width=True)

    # Build Excel (.xlsx) file in memory
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df_summary.to_excel(writer, sheet_name="소재_기본정보", index=False)
        if item_rows:
            df_items = pd.DataFrame(item_rows)
            df_items.to_excel(writer, sheet_name="상품_카드_상세목록", index=False)

    buffer.seek(0)

    # Download Excel Button
    st.download_button(
        label="📊 엑셀(.xlsx) 파일 다운로드",
        data=buffer,
        file_name="카카오모먼트_광고소재_세팅정보.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    # Image Gallery Preview
    st.markdown("### 🖼️ 이미지 프리뷰")
    img_cols = st.columns(4)
    for idx, row in enumerate(summary_rows):
        if row["url"]:
            with img_cols[idx % 4]:
                st.image(row["url"], caption=f"{row['name']}", use_column_width=True)
