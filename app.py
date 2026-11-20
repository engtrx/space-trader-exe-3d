import webview
import os
import sys

def get_path(filename):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, filename)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)

if __name__ == '__main__':
    # إنشاء نافذة تطبيق سطح المكتب
    webview.create_window(
        title='Space Trader 3D', 
        url=get_path('index.html'), 
        fullscreen=True,
        background_color='#000000'
    )
    webview.start()
