# =============================================================================
# VERSION ULTRA-SIMPLE - AUCUNE DEPANDANCE EXTERNE
# =============================================================================
"""
Utilise uniquement la bibliothèque standard Python (http.server + json).
Parfait pour démonstration rapide sans installer de packages.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from datetime import datetime
import re
from urllib.parse import urlparse, parse_qs

class SentimentHandler(BaseHTTPRequestHandler):
    
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_OPTIONS(self):
        self._set_headers()
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/health':
            self._set_headers()
            response = {
                "status": "UP",
                "service": "sentiment-analysis-simple",
                "model": "rule-based (Python standard library)",
                "timestamp": datetime.utcnow().isoformat(),
                "note": "Version ultra-simple sans dependencies"
            }
            self.wfile.write(json.dumps(response, indent=2, ensure_ascii=False).encode('utf-8'))
        
        elif parsed_path.path == '/stats':
            self._set_headers()
            response = {
                "service": "MTS Telecom - Sentiment Analysis SIMPLE",
                "version": "1.0.0-simple",
                "python_version": "Standard library only",
                "supported_languages": ["fr"],
                "endpoints": ["/health", "/analyze", "/stats"]
            }
            self.wfile.write(json.dumps(response, indent=2, ensure_ascii=False).encode('utf-8'))
        
        elif parsed_path.path == '/':
            self._set_headers()
            response = {
                "message": "MTS Telecom - Microservice Sentiment Analysis",
                "endpoints": {
                    "/health": "Health check",
                    "/analyze": "POST - Analyser un texte",
                    "/stats": "GET - Statistiques du service"
                },
                "example": {
                    "method": "POST",
                    "url": "/analyze",
                    "body": {
                        "text": "Excellent service !",
                        "ticket_id": 123
                    }
                }
            }
            self.wfile.write(json.dumps(response, indent=2, ensure_ascii=False).encode('utf-8'))
        
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode('utf-8'))
    
    def do_POST(self):
        if self.path == '/analyze':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                text = data.get('text', '')
                ticket_id = data.get('ticket_id')
                
                if not text or len(text.strip()) < 3:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({
                        "error": "Le texte doit contenir au moins 3 caractères"
                    }).encode('utf-8'))
                    return
                
                # ANALYSE
                result = self.analyze_sentiment(text)
                result['ticket_id'] = ticket_id
                result['processed_at'] = datetime.utcnow().isoformat()
                
                self._set_headers()
                self.wfile.write(json.dumps(result, indent=2, ensure_ascii=False).encode('utf-8'))
                
                print(f"✅ Analyse | Ticket: {ticket_id} | Sentiment: {result['sentiment']} | Stars: {result['stars']}")
                
            except json.JSONDecodeError:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "JSON invalide"}).encode('utf-8'))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode('utf-8'))
    
    def analyze_sentiment(self, text):
        """Analyse par règles lexicales simples"""
        text_lower = text.lower()
        
        # MOTS-CLÉS
        negative = ['inadmissible', 'horrible', 'nul', 'catastrophe', 'colère', 
                    'furieux', 'mécontent', 'déçu', 'pire', 'mauvais', 'problème',
                    'panne', 'bug', 'lent', 'cassé', 'ne marche pas', 'inacceptable',
                    'scandaleux', 'arnaque', 'résilier', 'remboursement']
        
        positive = ['excellent', 'super', 'merci', 'parfait', 'satisfait',
                    'content', 'bravo', 'génial', 'top', 'rapide', 'efficace',
                    'professionnel', 'formidable', 'impeccable', 'recommande']
        
        # COMPTAGE
        neg_count = sum(1 for word in negative if word in text_lower)
        pos_count = sum(1 for word in positive if word in text_lower)
        exclamations = text.count('!')
        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
        
        # SCORE
        score = pos_count - neg_count
        
        # Ajustements
        if exclamations > 2:
            if score < 0:
                score -= 1  # Plus de colère
            else:
                score += 1  # Plus d'enthousiasme
        
        if caps_ratio > 0.3:  # Beaucoup de MAJUSCULES = colère
            score -= 2
        
        # MAPPING
        if score <= -2:
            stars = 1
            sentiment = "TRÈS NÉGATIF"
            confidence = 85
        elif score == -1:
            stars = 2
            sentiment = "NÉGATIF"
            confidence = 75
        elif score == 0:
            stars = 3
            sentiment = "NEUTRE"
            confidence = 65
        elif score == 1:
            stars = 4
            sentiment = "POSITIF"
            confidence = 75
        else:
            stars = 5
            sentiment = "TRÈS POSITIF"
            confidence = 85
        
        # COLÈRE
        is_angry = (stars <= 2) and (confidence >= 60)
        priority_flag = "URGENT_EMOTIONAL" if is_angry else None
        
        return {
            "sentiment": sentiment,
            "score": confidence / 100,
            "stars": stars,
            "is_angry": is_angry,
            "priority_flag": priority_flag,
            "confidence": float(confidence)
        }
    
    def log_message(self, format, *args):
        """Personnalise les logs"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {format % args}")

def run(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, SentimentHandler)
    
    print("=" * 50)
    print("  MTS TELECOM - MICROSERVICE SENTIMENT")
    print("  Version Simple (Python standard library)")
    print("=" * 50)
    print()
    print(f"✅ Serveur démarré sur http://localhost:{port}")
    print()
    print("📚 Endpoints disponibles:")
    print(f"   - http://localhost:{port}/health")
    print(f"   - http://localhost:{port}/analyze (POST)")
    print(f"   - http://localhost:{port}/stats")
    print()
    print("🔧 Pour tester:")
    print('   curl http://localhost:8000/health')
    print()
    print("Appuyez sur Ctrl+C pour arrêter")
    print("=" * 50)
    print()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Arrêt du serveur...")
        httpd.shutdown()

if __name__ == '__main__':
    run(port=8000)
