import json
import decimal, datetime
import binascii

class Encoder(json.JSONEncoder):
    def __init__(self, **kwargs):
        super(Encoder, self).__init__(**kwargs)

    def default(self, obj):
        if isinstance(obj, datetime.datetime): return obj.isoformat()
        elif isinstance(obj, datetime.date): return obj.isoformat()
        elif isinstance(obj, datetime.time): return obj.isoformat()
        elif isinstance(obj, datetime.timedelta): return obj.total_seconds()
        elif isinstance(obj, decimal.Decimal): return str(obj)
        elif isinstance(obj, memoryview): return '0x' + binascii.hexlify(obj).decode('utf-8')
        elif isinstance(obj, Object): return self.encode(obj)
        else:
            try: return json.JSONEncoder.default(self, obj)
            except: return repr(obj)


class Decoder(json.JSONDecoder):
    pass


enc = Encoder(sort_keys=True)
dec = Decoder()
