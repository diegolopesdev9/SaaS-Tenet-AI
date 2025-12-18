
#!/usr/bin/env python3
"""
Script para verificar se o ambiente está configurado corretamente.
Verifica todas as variáveis de ambiente necessárias para o SaaS SDR Agent.
"""

import os
import sys
from pathlib import Path
from cryptography.fernet import Fernet

# Cores para output no terminal
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_success(message):
    print(f"{Colors.GREEN}✓{Colors.END} {message}")

def print_error(message):
    print(f"{Colors.RED}✗{Colors.END} {message}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠{Colors.END} {message}")

def print_header(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{message}{Colors.END}")

def check_env_file():
    """Verifica se o arquivo .env existe"""
    print_header("1. Verificando arquivo .env")
    env_path = Path(".env")
    
    if env_path.exists():
        print_success("Arquivo .env encontrado")
        return True
    else:
        print_error("Arquivo .env não encontrado")
        print_warning("Execute: cp .env.example .env")
        return False

def check_required_vars():
    """Verifica variáveis obrigatórias"""
    print_header("2. Verificando variáveis obrigatórias")
    
    required_vars = {
        'SUPABASE_URL': 'URL do projeto Supabase',
        'SUPABASE_KEY': 'Chave anon/service do Supabase',
        'GEMINI_API_KEY': 'API Key do Google Gemini',
        'JWT_SECRET': 'Chave secreta para JWT',
        'FERNET_KEY': 'Chave de criptografia Fernet',
    }
    
    all_ok = True
    for var, description in required_vars.items():
        value = os.getenv(var)
        if value and value not in ['', 'sua-key-aqui', 'gere-uma-chave-secreta-forte-aqui']:
            print_success(f"{var}: Configurada ({description})")
        else:
            print_error(f"{var}: Não configurada ({description})")
            all_ok = False
    
    return all_ok

def check_optional_vars():
    """Verifica variáveis opcionais"""
    print_header("3. Verificando variáveis opcionais")
    
    optional_vars = {
        'EVOLUTION_API_URL': 'URL da Evolution API',
        'EVOLUTION_API_KEY': 'Chave da Evolution API',
        'SMTP_HOST': 'Servidor SMTP',
        'SMTP_USER': 'Usuário SMTP',
        'CORS_ORIGINS': 'Origens CORS permitidas',
    }
    
    for var, description in optional_vars.items():
        value = os.getenv(var)
        if value and value not in ['', 'sua-key-aqui', 'https://sua-evolution-api.com']:
            print_success(f"{var}: Configurada ({description})")
        else:
            print_warning(f"{var}: Não configurada ({description})")

def validate_fernet_key():
    """Valida se a chave Fernet é válida"""
    print_header("4. Validando chave de criptografia")
    
    fernet_key = os.getenv('FERNET_KEY')
    if not fernet_key or fernet_key == 'sua-fernet-key-aqui':
        print_error("FERNET_KEY não configurada")
        print_warning("Gere uma chave com: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"")
        return False
    
    try:
        Fernet(fernet_key.encode())
        print_success("FERNET_KEY é válida")
        return True
    except Exception as e:
        print_error(f"FERNET_KEY inválida: {str(e)}")
        return False

def validate_supabase_url():
    """Valida formato da URL do Supabase"""
    print_header("5. Validando URL do Supabase")
    
    url = os.getenv('SUPABASE_URL', '')
    if not url or url == 'https://seu-projeto.supabase.co':
        print_error("SUPABASE_URL não configurada corretamente")
        return False
    
    if url.startswith('https://') and '.supabase.co' in url:
        print_success("SUPABASE_URL tem formato válido")
        return True
    else:
        print_warning("SUPABASE_URL pode ter formato incorreto")
        return True

def check_dependencies():
    """Verifica se dependências estão instaladas"""
    print_header("6. Verificando dependências Python")
    
    dependencies = [
        'fastapi',
        'uvicorn',
        'supabase',
        'pydantic',
        'cryptography',
        'google.generativeai'
    ]
    
    all_installed = True
    for dep in dependencies:
        try:
            __import__(dep.replace('.', '_'))
            print_success(f"{dep}: Instalado")
        except ImportError:
            print_error(f"{dep}: Não instalado")
            all_installed = False
    
    if not all_installed:
        print_warning("Execute: pip install -r requirements.txt")
    
    return all_installed

def check_frontend():
    """Verifica se o frontend está configurado"""
    print_header("7. Verificando configuração do frontend")
    
    frontend_path = Path("frontend")
    node_modules = frontend_path / "node_modules"
    
    if not frontend_path.exists():
        print_warning("Pasta frontend não encontrada")
        return False
    
    if node_modules.exists():
        print_success("Dependências do frontend instaladas")
    else:
        print_warning("Dependências do frontend não instaladas")
        print_warning("Execute: cd frontend && npm install")
        return False
    
    return True

def generate_env_template():
    """Gera um template .env se necessário"""
    print_header("8. Gerando template .env")
    
    if Path(".env").exists():
        print_warning(".env já existe, não será sobrescrito")
        return
    
    if not Path(".env.example").exists():
        print_error(".env.example não encontrado")
        return
    
    response = input("\nDeseja copiar .env.example para .env? (s/n): ")
    if response.lower() == 's':
        import shutil
        shutil.copy(".env.example", ".env")
        print_success("Arquivo .env criado a partir de .env.example")
        print_warning("IMPORTANTE: Edite o arquivo .env com suas credenciais reais!")
    else:
        print_warning("Arquivo .env não foi criado")

def main():
    """Função principal"""
    print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}  SDR Agent SaaS - Verificação de Ambiente{Colors.END}")
    print(f"{Colors.BOLD}{'='*60}{Colors.END}")
    
    # Load .env if exists
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print_warning("python-dotenv não instalado, variáveis .env não serão carregadas")
    
    checks = [
        check_env_file(),
        check_required_vars(),
        validate_fernet_key(),
        validate_supabase_url(),
        check_dependencies(),
    ]
    
    check_optional_vars()
    check_frontend()
    
    # Resumo
    print_header("Resumo da Verificação")
    
    required_checks = sum(checks)
    total_checks = len(checks)
    
    if required_checks == total_checks:
        print_success(f"Todas as verificações obrigatórias passaram ({required_checks}/{total_checks})")
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ Ambiente configurado corretamente!{Colors.END}")
        print(f"\n{Colors.BLUE}Para iniciar a aplicação:{Colors.END}")
        print("  Backend:  uvicorn app.main:app --reload")
        print("  Frontend: cd frontend && npm run dev")
        return 0
    else:
        print_error(f"Algumas verificações falharam ({required_checks}/{total_checks})")
        print(f"\n{Colors.RED}{Colors.BOLD}✗ Configure as variáveis faltantes no arquivo .env{Colors.END}")
        
        if not Path(".env").exists():
            generate_env_template()
        
        return 1

if __name__ == "__main__":
    sys.exit(main())
