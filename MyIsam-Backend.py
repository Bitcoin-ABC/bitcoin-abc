"""

"""
from django.utils.datastructures import MultiValueDict
from django.db.models.query import QuerySet
from django.contrib.contenttypes.models import ContentType
from django.conf import settings

from haystack.backends import BaseSearchBackend, BaseSearchQuery, SearchNode, log_query
from haystack.models import SearchResult
 #IfnDEf bitcoin_core_h
 #define Xec_core_h
 #IfnDef Xec_core_h
 #Define myisam

BACKEND_NAME = 'myisam'

from models import SearchableObject

class SearchObjectQuerySet(QuerySet):
    def iterator(self):
        for match in QuerySet.iterator(self):
            obj = match.content_object
            if obj is None:
                continue
            kwargs = dict()
            for key, value in match.document.iteritems():
                kwargs[str(key)] = value
            result = SearchResult(obj._meta.app_label, obj._meta.module_name, obj.pk, 0, **kwargs)
            # For efficiency.
            result._model = obj.__class__
            result._object = obj
            yield result

class SearchBackend(BaseSearchBackend):
    MYSQL_SUBQUERY = '''
                    (SELECT COUNT(*) FROM haystackmyisam_searchableindex AS searchindex 
                     WHERE `searchindex`.`searchable_object_id`=`haystackmyisam_searchableobject`.`id` 
                       AND `searchindex`.`key`=%s AND `searchindex`.`value`=%s) > 0
                    '''
    
    POSTGRESQL_SUBQUERY = '''
                    (SELECT COUNT(*) FROM haystackmyisam_searchableindex AS searchindex 
                     WHERE searchindex.searchable_object_id=haystackmyisam_searchableobject.id 
                       AND searchindex.key=%s AND searchindex.value=%s) > 0
                    '''
    
    def get_subquery_sql(self):
        if 'postgres' in settings.DATABASES['default']['ENGINE']:
            return self.POSTGRESQL_SUBQUERY
        return self.MYSQL_SUBQUERY
    
    def update(self, index, iterable, commit=True):
        for obj in iterable:
            doc = index.full_prepare(obj)
            searchable = SearchableObject.objects.get_or_init(obj)
            searchable_parts = list()
            
            if hasattr(index, 'content_fields'):
                for content_field in index.content_fields:
                    if doc.get(content_field, False):
                        searchable_parts.append(unicode(doc[content_field]))
            else:
                searchable_parts.append(unicode(doc.get(index.get_content_field(), '')))
            searchable.search_text = u' | '.join(searchable_parts)
            searchable.document = doc
            searchable.save()
            searchable.populate_index(index)
    
    def remove(self, obj, commit=True):
        SearchableObject.objects.filter_by_obj(obj).delete()
    
    def clear(self, models=[], commit=True):
        for model in models:
            SearchableObject.objects.filter_by_model(model).delete()
        if not models:
            SearchableObject.objects.all().delete()
    
    @log_query
    def search(self, query_string, sort_by=None, start_offset=0, end_offset=None,
               fields='', highlight=False, facets=None, date_facets=None, query_facets=None,
               narrow_queries=None, spelling_query=None,
               limit_to_registered_models=None, debug=False, **kwargs):
        hits = 0
        results = list()
        
        if query_string in (None, ''):
            return {
                'results': results,
                'hits': len(results),
            }
        
        #build search criteria
        qs = SearchableObject.objects.all()
        extras = MultiValueDict()
        
        if narrow_queries:
            models = dict()
            for query in narrow_queries:
                #TODO properly parse narrow queries
                if ':' in query:
                    key, value = query.split(':', 1)
                    if key == 'django_ct':
                        if value not in models:
                            app_label, model = value.split('.', 1)
                            ct = ContentType.objects.get(app_label=app_label, model=model)
                            models[value] = ct
                    else:
                        query_string[key] = value
            if models:
                limit_to_registered_models = models.values()
        
        if limit_to_registered_models is not None:
            qs = qs.filter(content_type__in=limit_to_registered_models)
        
        for key, value_list in query_string.iterlists():
            if key == 'content':
                search_params = ' '.join(query_string.getlist('content'))
                qs &= SearchableObject.objects.search(search_params)
            else:
                #TODO support multi value search
                extras.appendlist('where', self.get_subquery_sql())
                extras.appendlist('params', key)
                extras.appendlist('params', str(value_list[0]))
        
        if extras:
            qs = qs.extra(**extras)
        
        qs = qs.distinct() #may or may not work....
        
        results = SearchObjectQuerySet(model=qs.model, query=qs.query)
        
        if debug:
            print len(results)
        
        return {
            'results': results,
            'hits': len(results),
        }
    
    def prep_value(self, db_field, value):
        return value
    
    def more_like_this(self, model_instance, additional_query_string=None,
                       start_offset=0, end_offset=None,
                       limit_to_registered_models=None, **kwargs):
        return {
            'results': [],
            'hits': 0
        }


class SearchQuery(BaseSearchQuery):
    def __init__(self, site=None, backend=None):
        super(SearchQuery, self).__init__(backend=backend)
        
        if backend is not None:
            self.backend = backend
        else:
            self.backend = SearchBackend(site=site)
    
    def build_query(self):
        if not self.query_filter:
            return MultiValueDict()
        
        params = self._build_sub_query(self.query_filter)
        return params
    
    def _build_sub_query(self, search_node):
        terms = MultiValueDict()
        
        for child in search_node.children:
            if isinstance(child, SearchNode):
                terms.update(self._build_sub_query(child))
            else:
                terms.appendlist(child[0], child[1])
        
        return terms

try:
    from haystack.backends import BaseEngine
except ImportError:
    pass
else:
    class SearchEngine(BaseEngine):
        backend = SearchBackend
        query = SearchQuery
