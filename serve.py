import http.server
import os
import re
import socket
import ssl
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
HTTPS = '--https' in sys.argv


class Handler(http.server.SimpleHTTPRequestHandler):
    byte_range = None

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        match = re.match(r'bytes=(\d*)-(\d*)$', self.headers.get('Range', ''))
        if not match or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        start = int(match.group(1) or 0)
        end = min(int(match.group(2) or size - 1), size - 1)
        self.byte_range = (start, end)
        f = open(path, 'rb')
        f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        try:
            if not self.byte_range:
                return super().copyfile(source, outputfile)
            left = self.byte_range[1] - self.byte_range[0] + 1
            while left > 0:
                chunk = source.read(min(65536, left))
                if not chunk:
                    break
                outputfile.write(chunk)
                left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass


def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        return s.getsockname()[0]
    except OSError:
        return '127.0.0.1'
    finally:
        s.close()


os.chdir(HERE)

if HTTPS:
    ip = local_ip()
    cert, key = os.path.join(HERE, '.cert.pem'), os.path.join(HERE, '.key.pem')
    if not (os.path.exists(cert) and os.path.exists(key)):
        subprocess.run(
            ['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30',
             '-keyout', key, '-out', cert, '-subj', '/CN=localhost',
             '-addext', f'subjectAltName=DNS:localhost,IP:127.0.0.1,IP:{ip}'],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    server = http.server.ThreadingHTTPServer(('0.0.0.0', 8443), Handler)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(cert, key)
    server.socket = context.wrap_socket(server.socket, server_side=True)
    print(f'Open on the Quest: https://{ip}:8443', file=sys.stderr)
else:
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 8000), Handler)
    print('Open http://localhost:8000', file=sys.stderr)

server.serve_forever()
