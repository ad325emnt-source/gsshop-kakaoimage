# Adver61258KakaoMomentApi API 명세

이 문서는 사람이 직접 읽는 사용 설명서보다, AI가 API 호출 코드나 데이터 추출 코드를 만들기 쉽게 작성한 명세입니다.

## 1. 목적

`(GS SHOP) TF 업무 누적 시트`의 `광고그룹 ID` 값을 입력받아 카카오모먼트 광고 소재 정보를 조회한다.

AI는 이 명세를 기준으로 API 호출 코드를 만들고, 응답 JSON에서 마케팅 업무에 필요한 핵심 필드를 추출해야 한다.

현재 제공된 명세의 예시는 Python 코드로 작성되어 있으나, AI는 해당 Python 예시의 동작과 구조를 기준으로 사용자가 요청한 언어에 맞게 변환해야 한다.

## 2. Endpoint

```http
GET https://cuyr21hbxd.execute-api.ap-northeast-2.amazonaws.com/prod/61258/moment-creative-info
```

## 3. Authentication

요청 Header에 `x-api-key`를 포함해야 한다.

```http
x-api-key: 
```

`x-api-key` 값은 보안 정보이므로 이 문서에는 비워둔다. 실제 호출 시 사용자가 제공한 값을 넣는다.

API Key가 없거나 잘못된 경우 API Gateway에서 바로 `Forbidden` 응답이 발생한다.

## 4. Request

### 4.1 Query Parameters

| Name | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | yes | string | `(GS SHOP) TF 업무 누적 시트`의 `광고그룹 ID` 값 |

### 4.2 Request Example

```bash
curl -X GET "https://cuyr21hbxd.execute-api.ap-northeast-2.amazonaws.com/prod/61258/moment-creative-info?id=4412053" \
  -H "x-api-key: YOUR_API_KEY"
```

## 5. id 타입별 처리 규칙

`id` 값의 형태에 따라 카카오모먼트 내부 조회 방식과 응답 구조가 달라진다.

AI는 반드시 아래 규칙으로 응답을 해석해야 한다.

| id 형태 | 광고 유형 | 판별 규칙 | 주요 응답 위치 |
| --- | --- | --- | --- |
| 숫자로만 구성 | 기존 소재 광고 | 정규식 `^[0-9]+$` | `messageElement` 중심 |
| `msg-ad`로 시작 | 신규 메시지 광고 | 문자열 prefix `msg-ad` | top-level `items`, `buttons`, `description` 중심 |

Python 판별 예시는 아래와 같다.

```python
def detect_ad_type(ad_group_id: str) -> str:
    if ad_group_id.startswith("msg-ad"):
        return "new_message_ad"
    if ad_group_id.isdigit():
        return "legacy_creative_ad"
    return "unknown"
```

## 6. Response 공통 주의사항

외부 HTTP 호출에서는 응답 본문이 JSON으로 바로 내려올 수 있다.

일부 실행 환경에서는 아래처럼 wrapper 형태로 보일 수 있다.

```json
{
  "statusCode": 200,
  "headers": {},
  "body": {},
  "isBase64Encoded": false
}
```

AI가 코드를 만들 때는 두 형태를 모두 처리하는 것이 좋다.

```python
import json

def unwrap_response(data):
    if isinstance(data, dict) and "body" in data:
        body = data["body"]
        if isinstance(body, str):
            return json.loads(body)
        return body
    return data
```

## 7. 신규 메시지 광고 응답

### 7.1 판별 기준

요청한 `id`가 `msg-ad`로 시작하면 신규 메시지 광고이다.

예시:

```text
msg-ad-1508656973746950144
```

### 7.2 Response Example

```json
{
  "messageAdId": "msg-ad-1508656973746950144",
  "name": "0527_오늘만이혜택_하남쭈꾸미_new",
  "type": "WIDE_MESSAGE",
  "items": [
    {
      "landing": {
        "mobileLandingUrl": "https://my.gsshop.com/todayhanamzzukkuminew_260527_wide"
      },
      "imageUrl": "https://t1.daumcdn.net/b2/creative/692788/57205006abbc01301bd56ba9fef943c6.jpg"
    }
  ],
  "buttons": [
    {
      "title": "특가 확인하기",
      "mobileLandingUrl": "https://my.gsshop.com/todayhanamzzukkuminew_260527_wide"
    }
  ],
  "description": "5% 추가 할인 맛있게 매운 하남쭈꾸미 마지막 특가로 오늘 저녁 메뉴 고민 끝"
}
```

### 7.3 Required Fields to Extract

AI는 신규 메시지 광고 응답에서 아래 값을 우선 추출해야 한다.

| Output Field | JSON Path | Description |
| --- | --- | --- |
| `ad_type` | fixed value: `new_message_ad` | 신규 메시지 광고 |
| `message_ad_id` | `messageAdId` | 메시지 광고 소재 ID |
| `creative_name` | `name` | 광고 소재 이름 |
| `message_type` | `type` | 메시지 광고 유형 |
| `description` | `description` | 홍보 문구 |
| `landing_urls` | `items[*].landing.mobileLandingUrl` | 랜딩 URL 목록 |
| `button_urls` | `buttons[*].mobileLandingUrl` | 버튼 URL 목록 |
| `buttons` | `buttons[*].title`, `buttons[*].mobileLandingUrl` | 버튼명과 버튼 URL |
| `image_urls` | `items[*].imageUrl` | 이미지 URL 목록 |

### 7.4 Recommended Normalized Output

AI가 최종 결과를 만들 때는 아래 구조로 정규화하는 것을 권장한다.

```json
{
  "ad_type": "new_message_ad",
  "message_ad_id": "msg-ad-1508656973746950144",
  "creative_name": "0527_오늘만이혜택_하남쭈꾸미_new",
  "message_type": "WIDE_MESSAGE",
  "description": "홍보 문구",
  "landing_urls": [
    "https://my.gsshop.com/todayhanamzzukkuminew_260527_wide"
  ],
  "button_urls": [
    "https://my.gsshop.com/todayhanamzzukkuminew_260527_wide"
  ],
  "buttons": [
    {
      "title": "특가 확인하기",
      "mobile_landing_url": "https://my.gsshop.com/todayhanamzzukkuminew_260527_wide"
    }
  ],
  "image_urls": [
    "https://t1.daumcdn.net/b2/creative/692788/57205006abbc01301bd56ba9fef943c6.jpg"
  ]
}
```

## 8. 기존 소재 광고 응답

### 8.1 판별 기준

요청한 `id`가 숫자로만 이루어져 있으면 기존 소재 광고이다.

예시:

```text
4412053
```

### 8.2 Response Shape

기존 소재 광고는 `messageElement` 안에 마케팅 추출 대상 정보가 대부분 들어 있다.

응답이 wrapper 형태로 보일 경우 실제 데이터는 `body.messageElement`에 있다.

외부 HTTP 호출에서 wrapper 없이 내려올 경우 실제 데이터는 `messageElement`에 있다.

### 8.3 Response Example

```json
{
  "creativeId": 30803007,
  "name": "0527_오늘만이혜택_헨켈",
  "adGroupId": 4412053,
  "format": "CAROUSEL_COMMERCE_MESSAGE",
  "config": "ON",
  "systemConfig": "ON",
  "statusDescription": "발송 종료",
  "messageElement": {
    "id": 30803007,
    "name": "0527_오늘만이혜택_헨켈",
    "creativeFormat": "CAROUSEL_COMMERCE_MESSAGE",
    "title": "퍼실vs다우니 최강브랜드 특가대전",
    "description": "빨래 고민 끝 세제는 퍼실vs유연제는 다우니",
    "mobileLandingUrl": "https://my.gsshop.com/todayhenkel_260527_carousel0",
    "introMobileLandingUrl": "https://my.gsshop.com/todayhenkel_260527_carousel0",
    "buttonAssetGroups": [
      {
        "ordering": 0,
        "title": "구매하기",
        "mobileLandingUrl": "https://my.gsshop.com/todayhenkel_260527_carousel1"
      }
    ],
    "itemAssetGroups": [
      {
        "ordering": 0,
        "title": "퍼실 라벤더 2.5L x 4개",
        "mobileLandingUrl": "https://my.gsshop.com/todayhenkel_260527_carousel1",
        "priceCurrencyCode": "KRW",
        "priceAmount": "78400",
        "discountedPriceAmount": "49880"
      }
    ]
  }
}
```

### 8.4 Required Fields to Extract

AI는 기존 소재 광고 응답에서 아래 값을 우선 추출해야 한다.

| Output Field | JSON Path | Description |
| --- | --- | --- |
| `ad_type` | fixed value: `legacy_creative_ad` | 기존 소재 광고 |
| `creative_id` | `creativeId` | 소재 ID |
| `ad_group_id` | `adGroupId` | 광고그룹 ID |
| `creative_name` | `name` 또는 `messageElement.name` | 광고 소재 이름 |
| `format` | `format` 또는 `messageElement.creativeFormat` | 소재 형식 |
| `status_description` | `statusDescription` | 소재 상태 |
| `main_landing_url` | `messageElement.introMobileLandingUrl` | 대표 랜딩 URL. 업무상 "랜딩 URL"로 사용 |
| `fallback_landing_url` | `messageElement.mobileLandingUrl` | 대표 랜딩 URL이 없을 때 참고 |
| `promotion_title` | `messageElement.title` | 홍보 타이틀 |
| `description` | `messageElement.description` | 홍보 문구 |
| `button_urls` | `messageElement.buttonAssetGroups[*].mobileLandingUrl` | 버튼 URL 목록 |
| `items` | `messageElement.itemAssetGroups[*]` | 상품 또는 카드별 상세 정보 |

`itemAssetGroups`의 각 요소에서 반드시 추출할 필드는 아래와 같다.

| Output Field | JSON Path | Description |
| --- | --- | --- |
| `ordering` | `ordering` | 카드 순서 |
| `title` | `title` | 카드 또는 상품 타이틀 |
| `landing_url` | `mobileLandingUrl` | 해당 카드의 랜딩 URL |
| `currency` | `priceCurrencyCode` | 가격 화폐 단위 |
| `price_amount` | `priceAmount` | 가격 정보에 나타나는 가격 |
| `discounted_price_amount` | `discountedPriceAmount` | 할인 가격 정보 |
| `image_url` | `image.url` | 카드 이미지 URL |

### 8.5 Recommended Normalized Output

AI가 최종 결과를 만들 때는 아래 구조로 정규화하는 것을 권장한다.

```json
{
  "ad_type": "legacy_creative_ad",
  "creative_id": 30803007,
  "ad_group_id": 4412053,
  "creative_name": "0527_오늘만이혜택_헨켈",
  "format": "CAROUSEL_COMMERCE_MESSAGE",
  "status_description": "발송 종료",
  "main_landing_url": "https://my.gsshop.com/todayhenkel_260527_carousel0",
  "promotion_title": "홍보 타이틀",
  "description": "홍보 문구",
  "button_urls": [
    "https://my.gsshop.com/todayhenkel_260527_carousel1"
  ],
  "items": [
    {
      "ordering": 0,
      "title": "퍼실 라벤더 2.5L x 4개",
      "landing_url": "https://my.gsshop.com/todayhenkel_260527_carousel1",
      "currency": "KRW",
      "price_amount": "78400",
      "discounted_price_amount": "49880",
      "image_url": "https://t1.daumcdn.net/b2/creative/692788/8014c145403015ed1c24298193e1cb44.jpg"
    }
  ]
}
```

## 9. Python 호출 및 추출 예시

아래 코드는 AI가 생성할 수 있는 최소 예시이다.

```python
import json
import os
import argparse
import requests

API_URL = "https://cuyr21hbxd.execute-api.ap-northeast-2.amazonaws.com/prod/61258/moment-creative-info"


def unwrap_response(data):
    if isinstance(data, dict) and "body" in data:
        body = data["body"]
        if isinstance(body, str):
            return json.loads(body)
        return body
    return data


def normalize_url(url):
    if not url:
        return None
    if isinstance(url, str) and url.startswith("//"):
        return "https:" + url
    return url


def fetch_creative_info(ad_group_id, api_key):
    response = requests.get(
        API_URL,
        params={"id": ad_group_id},
        headers={"x-api-key": api_key},
        timeout=30,
    )
    response.raise_for_status()
    return unwrap_response(response.json())


def parse_creative(ad_group_id, data):
    if ad_group_id.startswith("msg-ad"):
        return parse_new_message_ad(data)
    if ad_group_id.isdigit():
        return parse_legacy_creative_ad(data)
    raise ValueError(f"Unknown ad_group_id format: {ad_group_id}")


def parse_new_message_ad(data):
    items = data.get("items") or []
    buttons = data.get("buttons") or []

    return {
        "ad_type": "new_message_ad",
        "message_ad_id": data.get("messageAdId"),
        "creative_name": data.get("name"),
        "message_type": data.get("type"),
        "description": data.get("description"),
        "landing_urls": [
            item.get("landing", {}).get("mobileLandingUrl")
            for item in items
            if item.get("landing", {}).get("mobileLandingUrl")
        ],
        "button_urls": [
            button.get("mobileLandingUrl")
            for button in buttons
            if button.get("mobileLandingUrl")
        ],
        "buttons": [
            {
                "title": button.get("title"),
                "mobile_landing_url": button.get("mobileLandingUrl"),
            }
            for button in buttons
        ],
        "image_urls": [
            normalize_url(item.get("imageUrl"))
            for item in items
            if item.get("imageUrl")
        ],
    }


def parse_legacy_creative_ad(data):
    message = data.get("messageElement") or {}
    button_groups = message.get("buttonAssetGroups") or []
    item_groups = message.get("itemAssetGroups") or []

    return {
        "ad_type": "legacy_creative_ad",
        "creative_id": data.get("creativeId"),
        "ad_group_id": data.get("adGroupId"),
        "creative_name": data.get("name") or message.get("name"),
        "format": data.get("format") or message.get("creativeFormat"),
        "status_description": data.get("statusDescription"),
        "main_landing_url": message.get("introMobileLandingUrl"),
        "fallback_landing_url": message.get("mobileLandingUrl"),
        "promotion_title": message.get("title"),
        "description": message.get("description"),
        "button_urls": [
            button.get("mobileLandingUrl")
            for button in button_groups
            if button.get("mobileLandingUrl")
        ],
        "items": [
            {
                "ordering": item.get("ordering"),
                "title": item.get("title"),
                "landing_url": item.get("mobileLandingUrl"),
                "currency": item.get("priceCurrencyCode"),
                "price_amount": item.get("priceAmount"),
                "discounted_price_amount": item.get("discountedPriceAmount"),
                "image_url": normalize_url((item.get("image") or {}).get("url")),
            }
            for item in item_groups
        ],
    }


def get_normalized_creative_info(ad_group_id, api_key):
    raw_data = fetch_creative_info(ad_group_id, api_key)
    return parse_creative(ad_group_id, raw_data)


def main():
    parser = argparse.ArgumentParser(description="Fetch and normalize creative info.")
    parser.add_argument("ad_group_id", help="Ad group ID. Example: msg-ad-123 or 123456")
    parser.add_argument(
        "--api-key",
        default=os.getenv("X_API_KEY"),
        help="API key. Defaults to the X_API_KEY environment variable.",
    )
    args = parser.parse_args()

    if not args.api_key:
        raise SystemExit("Missing API key. Set $env:X_API_KEY='...' or pass --api-key ...")

    result = get_normalized_creative_info(args.ad_group_id, args.api_key)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
```

### 9.1 Python 실행 명령어

AI가 위 예시를 기준으로 Python 파일을 생성했다면 아래 형식으로 실행할 수 있어야 한다.

```powershell
python .\파일이름.py "여기에_ad_group_id" --api-key "여기에_x_api_key"
```

기존 소재 광고 조회 예시는 아래와 같다.

```powershell
python .\파일이름.py "4412053" --api-key "여기에_x_api_key"
```

신규 메시지 광고 조회 예시는 아래와 같다.

```powershell
python .\파일이름.py "msg-ad-1508656973746950144" --api-key "여기에_x_api_key"
```

`x-api-key`를 명령어에 직접 쓰지 않고 환경변수로 전달할 수도 있다.

```powershell
$env:X_API_KEY="여기에_x_api_key"
python .\파일이름.py "4412053"
```

AI가 Python 파일을 생성할 때는 위 명령어로 실행 가능하도록 `argparse`를 사용해 `ad_group_id` 위치 인자와 `--api-key` 옵션을 받게 만든다.

## 10. Error Handling

### 10.1 API Key 오류

`x-api-key`가 없거나 잘못된 경우 API Gateway가 `Forbidden`을 반환한다.

이 경우 카카오모먼트 API까지 요청이 전달되지 않는다.

### 10.2 기타 오류

그 외 오류는 대부분 카카오모먼트 API의 에러 응답을 그대로 내려준다고 보면 된다.

오류 응답 예시는 아래와 같은 형태일 수 있다.

```json
{
  "success": false,
  "error": "카카오모먼트 API 또는 내부 처리 오류 메시지"
}
```

AI가 코드를 작성할 때는 아래 기준으로 처리한다.

| Status | Handling |
| --- | --- |
| `200` | JSON을 파싱하고 `id` 타입에 따라 정규화 |
| `403` 또는 `Forbidden` | API Key 오류로 판단 |
| 기타 `4xx` / `5xx` | 응답 본문을 그대로 사용자에게 보여주고, 카카오모먼트 API 오류 가능성이 높다고 안내 |

## 11. AI 응답 권장 형식

AI가 최종 사용자에게 보여줄 때는 원본 JSON 전체보다 아래 항목을 우선 요약한다.

### 신규 메시지 광고

| 항목 | 값 |
| --- | --- |
| 광고 소재 이름 | `creative_name` |
| 홍보 문구 | `description` |
| 랜딩 URL | `landing_urls` |
| 버튼 URL | `button_urls` |
| 이미지 URL | `image_urls` |

### 기존 소재 광고

| 항목 | 값 |
| --- | --- |
| 광고 소재 이름 | `creative_name` |
| 대표 랜딩 URL | `main_landing_url` |
| 홍보 타이틀 | `promotion_title` |
| 홍보 문구 | `description` |
| 버튼 URL | `button_urls` |
| 카드별 타이틀 | `items[*].title` |
| 카드별 가격 | `items[*].price_amount` |
| 카드별 할인 가격 | `items[*].discounted_price_amount` |
| 카드별 랜딩 URL | `items[*].landing_url` |

값이 없거나 응답에서 확인되지 않는 항목은 `응답에서 확인 불가`로 표시한다.
