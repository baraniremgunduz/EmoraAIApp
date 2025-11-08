#!/bin/bash

# GitHub Secrets Kurulum Scripti
# Bu script, GitHub Actions için gerekli secret'ları oluşturmanıza yardımcı olur.

set -e

echo "🔑 GitHub Actions Secrets Kurulum Scripti"
echo "=========================================="
echo ""

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# GitHub CLI kontrolü
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) bulunamadı.${NC}"
    echo "GitHub CLI kurulumu için: https://cli.github.com/"
    echo ""
    echo "Alternatif olarak, secret'ları manuel olarak GitHub web arayüzünden ekleyebilirsiniz:"
    echo "1. Repository → Settings → Secrets and variables → Actions"
    echo "2. New repository secret"
    echo ""
    read -p "Devam etmek istiyor musunuz? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    USE_GH_CLI=false
else
    USE_GH_CLI=true
    echo -e "${GREEN}✅ GitHub CLI bulundu${NC}"
fi

# GitHub authentication kontrolü
if [ "$USE_GH_CLI" = true ]; then
    if ! gh auth status &> /dev/null; then
        echo -e "${YELLOW}⚠️  GitHub'a giriş yapılmamış.${NC}"
        echo "GitHub'a giriş yapmak için: gh auth login"
        exit 1
    fi
    echo -e "${GREEN}✅ GitHub'a giriş yapılmış${NC}"
fi

echo ""
echo "📋 Kurulum Adımları:"
echo "1. EXPO_TOKEN oluşturulacak"
echo ""

# EXPO_TOKEN
echo ""
echo -e "${YELLOW}📝 EXPO_TOKEN${NC}"
echo "Expo Access Token oluşturmak için:"
echo "1. https://expo.dev/accounts/[username]/settings/access-tokens adresine gidin"
echo "2. 'Create Token' butonuna tıklayın"
echo "3. Token için bir isim verin (örn: 'GitHub Actions CI/CD')"
echo "4. Token'ı kopyalayın"
echo ""
read -p "EXPO_TOKEN değerini girin: " EXPO_TOKEN

if [ -z "$EXPO_TOKEN" ]; then
    echo -e "${RED}❌ EXPO_TOKEN boş olamaz${NC}"
    exit 1
fi

# Secret'ları ekle
echo ""
echo "🔐 Secret'lar ekleniyor..."

if [ "$USE_GH_CLI" = true ]; then
    # GitHub CLI ile ekle
    echo "EXPO_TOKEN ekleniyor..."
    echo "$EXPO_TOKEN" | gh secret set EXPO_TOKEN
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ EXPO_TOKEN başarıyla eklendi${NC}"
    else
        echo -e "${RED}❌ EXPO_TOKEN eklenirken hata oluştu${NC}"
        exit 1
    fi
else
    # Manuel talimatlar
    echo ""
    echo -e "${YELLOW}Manuel olarak eklemeniz gereken secret'lar:${NC}"
    echo ""
    echo "1. GitHub repository'nize gidin"
    echo "2. Settings → Secrets and variables → Actions"
    echo "3. 'New repository secret' butonuna tıklayın"
    echo "4. Name: EXPO_TOKEN"
    echo "5. Secret: [Yukarıda girdiğiniz token]"
    echo "6. 'Add secret' butonuna tıklayın"
    echo ""
    read -p "Secret'ları eklediniz mi? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⚠️  Secret'ları daha sonra ekleyebilirsiniz.${NC}"
    fi
fi

# Secret kontrolü
echo ""
echo "🔍 Secret'lar kontrol ediliyor..."

if [ "$USE_GH_CLI" = true ]; then
    echo ""
    echo "Mevcut secret'lar:"
    gh secret list
    
    echo ""
    echo -e "${GREEN}✅ Kurulum tamamlandı!${NC}"
    echo ""
    echo "📚 Sonraki adımlar:"
    echo "1. Bir commit push edin: git push origin main"
    echo "2. GitHub Actions sekmesinde workflow'ların çalıştığını kontrol edin"
else
    echo ""
    echo -e "${GREEN}✅ Kurulum tamamlandı!${NC}"
    echo ""
    echo "📚 Sonraki adımlar:"
    echo "1. Secret'ları GitHub'a ekleyin (yukarıdaki talimatları takip edin)"
    echo "2. Bir commit push edin: git push origin main"
    echo "3. GitHub Actions sekmesinde workflow'ların çalıştığını kontrol edin"
fi

echo ""
echo "📖 Detaylı dokümantasyon: GITHUB_ACTIONS_SETUP.md"

