# 아이템게토 · ItemGeto 링크 페이지

2030 신혼부부를 위한 가성비 꿀템 큐레이션 링크·검색 페이지입니다.
GitHub Pages로 배포되는 정적 사이트라 서버도, 유료 링크 서비스(머닝 등)도 필요 없습니다.

- 라이브 주소: `https://itemgeto.github.io/` (배포 후)
- 저장소: `https://github.com/itemgeto/itemgeto.github.io`

## 구조

```
index.html          화면 뼈대 (헤더·대가성 고지·검색·목록·푸터)
styles.css          디자인 (브랜드 팔레트, 모바일 퍼스트)
app.js              목록 렌더링·검색·카테고리 필터
data/products.json  상품 데이터 (여기만 고치면 목록이 바뀝니다)
README.md           이 문서
```

`index.html`은 GitHub Pages가 루트(`main` 브랜치 `/`)에서 그대로 서빙합니다.
빌드 단계가 없어서 파일을 고치고 커밋하면 1분 안에 반영됩니다.

## 상품 추가·수정하기

`data/products.json`의 `products` 배열에 항목을 하나 더 넣습니다.

```json
{
  "id": "005",
  "name": "상품명",
  "model": "모델명(없으면 빈 문자열)",
  "spec": "핵심 스펙 1줄",
  "price": 12300,
  "priceNote": "2026-11-20 기준",
  "category": "living",
  "platform": "쿠팡파트너스",
  "platformKey": "coupang",
  "ctaLabel": "가격 확인하기",
  "url": "https://link.coupang.com/a/...",
  "keywords": ["검색어", "별칭"]
}
```

규칙:

- `id`는 세 자리 번호(`001`부터). 카드 배지에 그대로 노출되고, 검색창에 `001`을 치면 그 상품만 남습니다.
- `category`는 `categories`에 있는 id만: `appliance`(가전), `living`(살림/생활).
- `price`는 숫자만(쉼표 없이). 화면에서 `2,190,000원`으로 자동 포맷됩니다.
- `priceNote`에는 실제 확인일을 적습니다. `updatedAt`도 함께 갱신하세요.
- `platformKey`는 점 색을 정합니다: `naver` = 네이비, `coupang` = 오렌지.
- `keywords`는 상품명에 없는 검색어(모델명·별칭·용도)를 넣는 자리입니다.
- **확인한 가격·스펙만** 넣습니다. 확인이 안 된 값은 비워 두세요.

채널 버튼은 `channels` 배열에서 수정합니다.

## 디자인 규칙

브랜드 가이드(v2) 팔레트만 씁니다. 다른 색을 새로 넣지 않습니다.

| 역할 | 값 |
| --- | --- |
| 메인 딥 네이비 | `#0F1F41` (그라데이션 상단 `#0F2045`) |
| 포인트 옐로 | `#FFB319` |
| 포인트 오렌지 | `#FF9100` |
| 보조 텍스트 | `#5A6987` |
| 카드 테두리 | `#E1E7F2` |
| 배경 | `#F5F7FB`, 고지 박스 크림 `#FFF8EA` |

- 모바일 퍼스트: 375~430px 기준 1열, 최대 폭 520px.
- 대가성 고지문은 **첫 상품 링크보다 위**에 항상 노출됩니다(`index.html`의 `.disclosure`). 구조를 바꿀 때도 이 위치를 지키세요.
- 제휴 링크에는 `rel="sponsored nofollow noopener"`가 붙어 있습니다.

## 로컬에서 보기

```bash
python3 -m http.server 8000
# http://localhost:8000
```

`index.html`을 파일로 바로 열면 `data/products.json`을 읽지 못해 "불러오지 못했어요"가 뜹니다. 로컬 서버로 확인하세요.

## 배포 (GitHub Pages)

`main` 브랜치 루트를 그대로 서빙합니다.

```bash
git add -A
git commit -m "feat: 상품 005 추가"
git push origin main
```

푸시 후 반영까지 보통 30초~1분 걸립니다. 캐시가 남으면 `Ctrl+Shift+R`로 새로고침하세요.
