
"""
Configuração centralizada de logging para a aplicação.
"""
import logging
import sys


def setup_logger(name: str = __name__) -> logging.Logger:
    """
    Configura e retorna um logger com formato detalhado.
    
    Args:
        name: Nome do módulo que está criando o logger
        
    Returns:
        logging.Logger: Logger configurado
    """
    # Configurar formato detalhado de logging
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Configurar logging básico
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Criar e retornar logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    return logger
