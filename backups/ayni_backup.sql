--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: accidentes_estado_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.accidentes_estado_enum AS ENUM (
    'REPORTADO',
    'EN_INVESTIGACION',
    'RESUELTO'
);


ALTER TYPE public.accidentes_estado_enum OWNER TO postgres;

--
-- Name: accidentes_severidad_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.accidentes_severidad_enum AS ENUM (
    'LEVE',
    'MODERADO',
    'GRAVE',
    'CRITICO'
);


ALTER TYPE public.accidentes_severidad_enum OWNER TO postgres;

--
-- Name: alertas_prioridad_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.alertas_prioridad_enum AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE public.alertas_prioridad_enum OWNER TO postgres;

--
-- Name: alertas_tipo_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.alertas_tipo_enum AS ENUM (
    'POR_VENCER',
    'VENCIDO',
    'CRITICO'
);


ALTER TYPE public.alertas_tipo_enum OWNER TO postgres;

--
-- Name: authorization_codes_action_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.authorization_codes_action_enum AS ENUM (
    'DELETE_RECORD'
);


ALTER TYPE public.authorization_codes_action_enum OWNER TO postgres;

--
-- Name: authorization_codes_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.authorization_codes_status_enum AS ENUM (
    'PENDING',
    'USED',
    'EXPIRED'
);


ALTER TYPE public.authorization_codes_status_enum OWNER TO postgres;

--
-- Name: record_movement_history_action_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.record_movement_history_action_enum AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'RESTORE',
    'STATUS_CHANGE',
    'IMAGE_UPLOAD',
    'IMAGE_REPLACE',
    'IMAGE_DELETE',
    'LOCATION_CHANGE',
    'COMPANY_CHANGE',
    'MAINTENANCE'
);


ALTER TYPE public.record_movement_history_action_enum OWNER TO postgres;

--
-- Name: record_relationships_relationship_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.record_relationships_relationship_type_enum AS ENUM (
    'REPLACEMENT',
    'DIVISION',
    'UPGRADE'
);


ALTER TYPE public.record_relationships_relationship_type_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accidentes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accidentes (
    id integer NOT NULL,
    linea_vida_id integer NOT NULL,
    fecha_accidente date NOT NULL,
    descripcion_incidente text NOT NULL,
    persona_involucrada character varying(200),
    acciones_correctivas text,
    evidencias_urls text,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    reportado_por integer,
    estado public.accidentes_estado_enum DEFAULT 'REPORTADO'::public.accidentes_estado_enum NOT NULL,
    severidad public.accidentes_severidad_enum DEFAULT 'LEVE'::public.accidentes_severidad_enum NOT NULL
);


ALTER TABLE public.accidentes OWNER TO postgres;

--
-- Name: accidentes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accidentes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accidentes_id_seq OWNER TO postgres;

--
-- Name: accidentes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accidentes_id_seq OWNED BY public.accidentes.id;


--
-- Name: alertas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alertas (
    id integer NOT NULL,
    tipo public.alertas_tipo_enum NOT NULL,
    registro_id integer NOT NULL,
    mensaje character varying NOT NULL,
    prioridad public.alertas_prioridad_enum DEFAULT 'medium'::public.alertas_prioridad_enum NOT NULL,
    fecha_creada timestamp without time zone DEFAULT now() NOT NULL,
    leida boolean DEFAULT false NOT NULL,
    fecha_leida timestamp without time zone,
    usuario_id integer,
    metadata text,
    frecuencia_mostrada integer DEFAULT 1 NOT NULL,
    ultima_vez_mostrada timestamp without time zone
);


ALTER TABLE public.alertas OWNER TO postgres;

--
-- Name: alertas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alertas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alertas_id_seq OWNER TO postgres;

--
-- Name: alertas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.alertas_id_seq OWNED BY public.alertas.id;


--
-- Name: authorization_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.authorization_codes (
    id integer NOT NULL,
    code character varying(8) NOT NULL,
    action public.authorization_codes_action_enum NOT NULL,
    resource_id integer NOT NULL,
    resource_code character varying NOT NULL,
    requested_by_user_id integer NOT NULL,
    authorized_by_user_id integer,
    status public.authorization_codes_status_enum DEFAULT 'PENDING'::public.authorization_codes_status_enum NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    request_ip character varying(45),
    justification text
);


ALTER TABLE public.authorization_codes OWNER TO postgres;

--
-- Name: authorization_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.authorization_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.authorization_codes_id_seq OWNER TO postgres;

--
-- Name: authorization_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.authorization_codes_id_seq OWNED BY public.authorization_codes.id;


--
-- Name: maintenances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenances (
    id integer NOT NULL,
    record_id integer NOT NULL,
    maintenance_date date NOT NULL,
    description text,
    image_filename character varying,
    image_r2_key character varying,
    image_size integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by integer,
    previous_length_meters double precision,
    new_length_meters double precision
);


ALTER TABLE public.maintenances OWNER TO postgres;

--
-- Name: maintenances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.maintenances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.maintenances_id_seq OWNER TO postgres;

--
-- Name: maintenances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.maintenances_id_seq OWNED BY public.maintenances.id;


--
-- Name: record_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.record_images (
    id integer NOT NULL,
    record_id integer NOT NULL,
    filename character varying NOT NULL,
    original_name character varying NOT NULL,
    file_size integer NOT NULL,
    mime_type character varying NOT NULL,
    r2_key character varying NOT NULL,
    description character varying,
    upload_date timestamp without time zone DEFAULT now() NOT NULL,
    uploaded_by integer,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.record_images OWNER TO postgres;

--
-- Name: record_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.record_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.record_images_id_seq OWNER TO postgres;

--
-- Name: record_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.record_images_id_seq OWNED BY public.record_images.id;


--
-- Name: record_movement_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.record_movement_history (
    id integer NOT NULL,
    record_id integer,
    action public.record_movement_history_action_enum NOT NULL,
    description character varying(500) NOT NULL,
    action_date timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer,
    username character varying(255),
    previous_values text,
    new_values text,
    changed_fields text,
    is_record_active boolean DEFAULT true NOT NULL,
    record_code character varying(255),
    additional_metadata text,
    ip_address character varying(45),
    user_agent character varying(500)
);


ALTER TABLE public.record_movement_history OWNER TO postgres;

--
-- Name: record_movement_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.record_movement_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.record_movement_history_id_seq OWNER TO postgres;

--
-- Name: record_movement_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.record_movement_history_id_seq OWNED BY public.record_movement_history.id;


--
-- Name: record_relationships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.record_relationships (
    id integer NOT NULL,
    parent_record_id integer NOT NULL,
    child_record_id integer NOT NULL,
    relationship_type public.record_relationships_relationship_type_enum NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by integer NOT NULL
);


ALTER TABLE public.record_relationships OWNER TO postgres;

--
-- Name: record_relationships_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.record_relationships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.record_relationships_id_seq OWNER TO postgres;

--
-- Name: record_relationships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.record_relationships_id_seq OWNED BY public.record_relationships.id;


--
-- Name: registro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registro (
    id integer NOT NULL,
    codigo character varying NOT NULL,
    cliente character varying,
    equipo character varying,
    fv_anios integer,
    fv_meses integer,
    fecha_instalacion date,
    longitud double precision,
    observaciones character varying,
    seec character varying,
    tipo_linea character varying,
    ubicacion character varying,
    fecha_caducidad date,
    estado_actual character varying,
    anclaje_equipos character varying(100),
    codigo_placa character varying(50)
);


ALTER TABLE public.registro OWNER TO postgres;

--
-- Name: COLUMN registro.codigo_placa; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.registro.codigo_placa IS 'Código de identificación físico de la placa';


--
-- Name: registro_estado_historial; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registro_estado_historial (
    id integer NOT NULL,
    registro_id integer NOT NULL,
    fecha_cambio timestamp without time zone DEFAULT now() NOT NULL,
    observacion character varying,
    estado character varying NOT NULL
);


ALTER TABLE public.registro_estado_historial OWNER TO postgres;

--
-- Name: registro_estado_historial_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.registro_estado_historial_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registro_estado_historial_id_seq OWNER TO postgres;

--
-- Name: registro_estado_historial_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.registro_estado_historial_id_seq OWNED BY public.registro_estado_historial.id;


--
-- Name: registro_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.registro_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.registro_id_seq OWNER TO postgres;

--
-- Name: registro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.registro_id_seq OWNED BY public.registro.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    usuario character varying NOT NULL,
    apellidos character varying,
    cargo character varying,
    celular character varying,
    contrasenia character varying NOT NULL,
    email character varying NOT NULL,
    empresa character varying NOT NULL,
    nombre character varying NOT NULL,
    rol character varying NOT NULL
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: accidentes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accidentes ALTER COLUMN id SET DEFAULT nextval('public.accidentes_id_seq'::regclass);


--
-- Name: alertas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alertas ALTER COLUMN id SET DEFAULT nextval('public.alertas_id_seq'::regclass);


--
-- Name: authorization_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authorization_codes ALTER COLUMN id SET DEFAULT nextval('public.authorization_codes_id_seq'::regclass);


--
-- Name: maintenances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenances ALTER COLUMN id SET DEFAULT nextval('public.maintenances_id_seq'::regclass);


--
-- Name: record_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_images ALTER COLUMN id SET DEFAULT nextval('public.record_images_id_seq'::regclass);


--
-- Name: record_movement_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_movement_history ALTER COLUMN id SET DEFAULT nextval('public.record_movement_history_id_seq'::regclass);


--
-- Name: record_relationships id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_relationships ALTER COLUMN id SET DEFAULT nextval('public.record_relationships_id_seq'::regclass);


--
-- Name: registro id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registro ALTER COLUMN id SET DEFAULT nextval('public.registro_id_seq'::regclass);


--
-- Name: registro_estado_historial id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registro_estado_historial ALTER COLUMN id SET DEFAULT nextval('public.registro_estado_historial_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: accidentes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accidentes (id, linea_vida_id, fecha_accidente, descripcion_incidente, persona_involucrada, acciones_correctivas, evidencias_urls, fecha_creacion, reportado_por, estado, severidad) FROM stdin;
\.


--
-- Data for Name: alertas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alertas (id, tipo, registro_id, mensaje, prioridad, fecha_creada, leida, fecha_leida, usuario_id, metadata, frecuencia_mostrada, ultima_vez_mostrada) FROM stdin;
\.


--
-- Data for Name: authorization_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.authorization_codes (id, code, action, resource_id, resource_code, requested_by_user_id, authorized_by_user_id, status, created_at, expires_at, used_at, request_ip, justification) FROM stdin;
\.


--
-- Data for Name: maintenances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenances (id, record_id, maintenance_date, description, image_filename, image_r2_key, image_size, created_at, created_by, previous_length_meters, new_length_meters) FROM stdin;
3	194	2025-08-22	imagen	maintenance-1755932151118.png	records/194/eabecf9a-d34b-4b75-8ca0-c1685bdfd45f.jpeg	150005	2025-08-23 01:55:51.947348	4	20	8
\.


--
-- Data for Name: record_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.record_images (id, record_id, filename, original_name, file_size, mime_type, r2_key, description, upload_date, uploaded_by, is_active) FROM stdin;
15	194	427627dd-2494-439b-a9b3-eac959219b57.jpeg	cronograma_sprint2_fechas_reales.png	150005	image/jpeg	records/194/427627dd-2494-439b-a9b3-eac959219b57.jpeg	\N	2025-08-22 15:42:42.754203	4	t
\.


--
-- Data for Name: record_movement_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.record_movement_history (id, record_id, action, description, action_date, user_id, username, previous_values, new_values, changed_fields, is_record_active, record_code, additional_metadata, ip_address, user_agent) FROM stdin;
1	\N	CREATE	Registro creado: pepe-test	2025-08-13 23:03:14.535125	4	admin	\N	{"codigo":"pepe-test","cliente":"UPAO","equipo":"oscar","anclaje_equipos":"anclaje","fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-07","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-08-07T00:00:00.000Z","estado_actual":"ACTIVO"}	["codigo","cliente","equipo","anclaje_equipos","fv_anios","fv_meses","fecha_instalacion","longitud","observaciones","seec","tipo_linea","ubicacion","fecha_caducidad","estado_actual"]	t	pepe-test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
2	\N	IMAGE_UPLOAD	Imagen subida: cronograma_sprint2_fechas_reales.png (146KB)	2025-08-13 23:04:44.86973	4	admin	\N	{"filename":"ce9c5fb8-19cb-4122-a34d-42ab444f3913.jpeg","size":150005,"originalName":"cronograma_sprint2_fechas_reales.png"}	\N	t	pepe-test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
3	\N	DELETE	Registro eliminado: pepe-test	2025-08-13 23:05:25.737214	4	admin	{"codigo":"pepe-test","cliente":"UPAO","equipo":"oscar","anclaje_equipos":"anclaje","fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-07","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-08-06","estado_actual":"ACTIVO"}	\N	\N	t	pepe-test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
4	\N	DELETE	Registro eliminado: pepe-test	2025-08-13 23:05:26.872149	4	admin	{"codigo":"pepe-test","cliente":"UPAO","equipo":"oscar","anclaje_equipos":"anclaje","fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-07","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-08-06","estado_actual":"ACTIVO"}	\N	\N	t	pepe-test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
5	\N	DELETE	Registro eliminado: pepe-test	2025-08-13 23:05:28.940862	4	admin	{"codigo":"pepe-test","cliente":"UPAO","equipo":"oscar","anclaje_equipos":"anclaje","fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-07","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-08-06","estado_actual":"ACTIVO"}	\N	\N	t	pepe-test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
6	\N	DELETE	Registro eliminado: pepe-test	2025-08-13 23:05:32.984841	4	admin	{"codigo":"pepe-test","cliente":"UPAO","equipo":"oscar","anclaje_equipos":"anclaje","fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-07","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-08-06","estado_actual":"ACTIVO"}	\N	\N	t	pepe-test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
7	\N	DELETE	Registro eliminado: pepe-test	2025-08-13 23:08:19.02033	4	admin	{"codigo":"pepe-test","cliente":"UPAO","equipo":"oscar","anclaje_equipos":"anclaje","fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-07","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-08-06","estado_actual":"ACTIVO"}	\N	\N	t	pepe-test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
11	\N	DELETE	Registro eliminado: cod-zahir	2025-08-19 18:01:28.494384	4	admin	{"codigo":"cod-zahir","cliente":"UPAO","equipo":"equipo test","anclaje_equipos":"anclaje","codigo_placa":null,"fv_anios":1,"fv_meses":1,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"testing","seec":"zahir","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-08-31","estado_actual":"ACTIVO"}	\N	\N	t	cod-zahir	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
17	\N	DELETE	Registro eliminado: LV-ABC-001	2025-08-22 13:01:58.864187	4	admin	{"codigo":"LV-ABC-001","cliente":"Empresa ABC","equipo":"Línea de vida horizontal","anclaje_equipos":null,"codigo_placa":null,"fv_anios":null,"fv_meses":null,"fecha_instalacion":null,"longitud":null,"observaciones":null,"seec":null,"tipo_linea":null,"ubicacion":"Edificio ABC - Azotea","fecha_caducidad":null,"estado_actual":"ACTIVO"}	\N	\N	t	LV-ABC-001	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
9	\N	CREATE	Registro creado: placa	2025-08-19 00:18:58.195419	4	admin	\N	{"codigo":"placa","cliente":"UPAO","equipo":"placa","anclaje_equipos":"anclaje","codigo_placa":"plc","fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-08-01T00:00:00.000Z","estado_actual":"ACTIVO"}	["codigo","cliente","equipo","anclaje_equipos","codigo_placa","fv_anios","fv_meses","fecha_instalacion","longitud","observaciones","seec","tipo_linea","ubicacion","fecha_caducidad","estado_actual"]	t	placa	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
14	\N	CREATE	Registro creado: solicitud	2025-08-22 13:01:05.42387	11	jhoel	\N	{"codigo":"solicitud","cliente":"UPAO","equipo":"equipo","anclaje_equipos":"anclaje","codigo_placa":"solicitud","fv_anios":null,"fv_meses":1,"fecha_instalacion":"2025-08-14","longitud":90,"observaciones":"test","seec":"sección","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2025-09-14T00:00:00.000Z","estado_actual":"ACTIVO"}	["codigo","cliente","equipo","anclaje_equipos","codigo_placa","fv_anios","fv_meses","fecha_instalacion","longitud","observaciones","seec","tipo_linea","ubicacion","fecha_caducidad","estado_actual"]	t	solicitud	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
15	\N	DELETE	Registro eliminado: solicitud	2025-08-22 13:01:23.595817	11	jhoel	{"codigo":"solicitud","cliente":"UPAO","equipo":"equipo","anclaje_equipos":"anclaje","codigo_placa":"solicitud","fv_anios":null,"fv_meses":1,"fecha_instalacion":"2025-08-14","longitud":90,"observaciones":"test","seec":"sección","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2025-09-13","estado_actual":"ACTIVO"}	\N	\N	t	solicitud	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
13	\N	CREATE	Registro creado: LV-XYZ-001	2025-08-21 00:02:47.880787	\N	usuario_empresa_abc	\N	{"codigo":"LV-XYZ-001","cliente":"Empresa XYZ","equipo":"Línea de vida vertical","anclaje_equipos":null,"codigo_placa":null,"fv_anios":null,"fv_meses":null,"fecha_instalacion":null,"longitud":null,"observaciones":null,"seec":null,"tipo_linea":null,"ubicacion":"Torre XYZ - Piso 15","fecha_caducidad":null,"estado_actual":"ACTIVO"}	["codigo","cliente","equipo","anclaje_equipos","codigo_placa","fv_anios","fv_meses","fecha_instalacion","longitud","observaciones","seec","tipo_linea","ubicacion","fecha_caducidad","estado_actual"]	t	LV-XYZ-001	\N	::1	Apidog/1.0.0 (https://apidog.com)
16	\N	DELETE	Registro eliminado: LV-XYZ-001	2025-08-22 13:01:53.905757	4	admin	{"codigo":"LV-XYZ-001","cliente":"Empresa XYZ","equipo":"Línea de vida vertical","anclaje_equipos":null,"codigo_placa":null,"fv_anios":null,"fv_meses":null,"fecha_instalacion":null,"longitud":null,"observaciones":null,"seec":null,"tipo_linea":null,"ubicacion":"Torre XYZ - Piso 15","fecha_caducidad":null,"estado_actual":"ACTIVO"}	\N	\N	t	LV-XYZ-001	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
12	\N	CREATE	Registro creado: LV-ABC-001	2025-08-21 00:02:29.931758	\N	usuario_empresa_abc	\N	{"codigo":"LV-ABC-001","cliente":"Empresa ABC","equipo":"Línea de vida horizontal","anclaje_equipos":null,"codigo_placa":null,"fv_anios":null,"fv_meses":null,"fecha_instalacion":null,"longitud":null,"observaciones":null,"seec":null,"tipo_linea":null,"ubicacion":"Edificio ABC - Azotea","fecha_caducidad":null,"estado_actual":"ACTIVO"}	["codigo","cliente","equipo","anclaje_equipos","codigo_placa","fv_anios","fv_meses","fecha_instalacion","longitud","observaciones","seec","tipo_linea","ubicacion","fecha_caducidad","estado_actual"]	t	LV-ABC-001	\N	::1	Apidog/1.0.0 (https://apidog.com)
18	\N	DELETE	Registro eliminado: UPAO-test	2025-08-22 13:02:03.448983	4	admin	{"codigo":"UPAO-test","cliente":"UPAO","equipo":"equipo","anclaje_equipos":null,"codigo_placa":null,"fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-07","longitud":90,"observaciones":"esperanza","seec":"seec","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-08-06","estado_actual":"ACTIVO"}	\N	\N	t	UPAO-test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
19	\N	DELETE	Registro eliminado: jhoel-historial	2025-08-22 13:02:43.032236	4	admin	{"codigo":"jhoel-historial","cliente":"UPAO","equipo":"equipo","anclaje_equipos":"anclaje","codigo_placa":null,"fv_anios":2,"fv_meses":null,"fecha_instalacion":"2025-08-07","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2027-08-06","estado_actual":"ACTIVO"}	\N	\N	t	jhoel-historial	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
20	\N	DELETE	Registro eliminado: cod-tes	2025-08-22 13:02:46.859967	4	admin	{"codigo":"cod-tes","cliente":"Chimu","equipo":"equipo-test","anclaje_equipos":null,"codigo_placa":null,"fv_anios":2,"fv_meses":2,"fecha_instalacion":"2025-08-06","longitud":2,"observaciones":"tes","seec":"seec","tipo_linea":"permanente_vertical","ubicacion":"aynic","fecha_caducidad":"2027-10-05","estado_actual":"ACTIVO"}	\N	\N	t	cod-tes	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
21	\N	DELETE	Registro eliminado: jhoel-test'ayni	2025-08-22 13:02:50.147138	4	admin	{"codigo":"jhoel-test'ayni","cliente":"Chimu","equipo":"equipo","anclaje_equipos":null,"codigo_placa":null,"fv_anios":5,"fv_meses":0,"fecha_instalacion":"2025-08-05","longitud":90,"observaciones":"test","seec":"seec","tipo_linea":"permanente_horizontal","ubicacion":"ayni","fecha_caducidad":"2030-08-04","estado_actual":"ACTIVO"}	\N	\N	t	jhoel-test'ayni	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
22	\N	DELETE	Registro eliminado: upao test 2	2025-08-22 13:02:53.784499	4	admin	{"codigo":"upao test 2","cliente":"UPAO","equipo":"equipo x","anclaje_equipos":null,"codigo_placa":null,"fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-01","longitud":30,"observaciones":"testin","seec":"seec","tipo_linea":"permanente_horizontal","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	\N	\N	t	upao test 2	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
23	\N	DELETE	Registro eliminado: codigo ayni	2025-08-22 13:03:02.853972	4	admin	{"codigo":"codigo ayni","cliente":"UPAO","equipo":"equipo l","anclaje_equipos":null,"codigo_placa":null,"fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"n","seec":"ssec","tipo_linea":"temporal_horizontal","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	\N	\N	t	codigo ayni	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
24	\N	DELETE	Registro eliminado: COD-Test	2025-08-22 13:03:07.462281	4	admin	{"codigo":"COD-Test","cliente":"Test","equipo":"Equipo-Test","anclaje_equipos":null,"codigo_placa":null,"fv_anios":2,"fv_meses":2,"fecha_instalacion":"2025-08-01","longitud":100,"observaciones":"testing","seec":"SEEC-Test","tipo_linea":"vertical","ubicacion":"ayni","fecha_caducidad":"2027-10-01","estado_actual":"ACTIVO"}	\N	\N	t	COD-Test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
25	\N	DELETE	Registro eliminado: ayni uo	2025-08-22 13:03:52.843159	4	admin	{"codigo":"ayni uo","cliente":"Universidad Nacional de Trujillo (UNT)","equipo":"equipo 9","anclaje_equipos":null,"codigo_placa":null,"fv_anios":1,"fv_meses":0,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"test","seec":"seec 90","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	\N	\N	t	ayni uo	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
26	\N	DELETE	Registro eliminado: upao aa	2025-08-22 13:03:56.790092	4	admin	{"codigo":"upao aa","cliente":"UPAO","equipo":"upao","anclaje_equipos":null,"codigo_placa":null,"fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-01","longitud":80,"observaciones":"test","seec":"seec","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	\N	\N	t	upao aa	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
27	\N	DELETE	Registro eliminado: jorge-code	2025-08-22 13:04:13.684107	4	admin	{"codigo":"jorge-code","cliente":"UPAO","equipo":"upao","anclaje_equipos":null,"codigo_placa":null,"fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"esperanza","seec":"seec","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	\N	\N	t	jorge-code	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
28	\N	DELETE	Registro eliminado: upao-jorge	2025-08-22 13:04:17.217486	4	admin	{"codigo":"upao-jorge","cliente":"Cartavio","equipo":"discord","anclaje_equipos":null,"codigo_placa":null,"fv_anios":2,"fv_meses":0,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"esperanza","seec":"upao","tipo_linea":"permanente_horizontal","ubicacion":"ayni","fecha_caducidad":"2027-07-31","estado_actual":"ACTIVO"}	\N	\N	t	upao-jorge	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
29	\N	DELETE	Registro eliminado: pablo-test	2025-08-22 13:04:21.027458	4	admin	{"codigo":"pablo-test","cliente":"UPAO","equipo":"equipo","anclaje_equipos":"puntos fijos","codigo_placa":null,"fv_anios":1,"fv_meses":0,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"testeando anclaje","seec":"seec","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	\N	\N	t	pablo-test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
30	\N	DELETE	Registro eliminado: imagen-test	2025-08-22 13:04:25.501785	4	admin	{"codigo":"imagen-test","cliente":"UPAO","equipo":"equipo","anclaje_equipos":"quimica","codigo_placa":null,"fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	\N	\N	t	imagen-test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
8	\N	CREATE	Registro creado: remoto-cod	2025-08-14 10:06:35.678557	4	admin	\N	{"codigo":"remoto-cod","cliente":"UPAO","equipo":"equipo","anclaje_equipos":"anclaje","fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-08-01T00:00:00.000Z","estado_actual":"ACTIVO"}	["codigo","cliente","equipo","anclaje_equipos","fv_anios","fv_meses","fecha_instalacion","longitud","observaciones","seec","tipo_linea","ubicacion","fecha_caducidad","estado_actual"]	t	remoto-cod	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
31	\N	DELETE	Registro eliminado: remoto-cod	2025-08-22 13:04:29.212501	4	admin	{"codigo":"remoto-cod","cliente":"UPAO","equipo":"equipo","anclaje_equipos":"anclaje","codigo_placa":null,"fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	\N	\N	t	remoto-cod	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
33	\N	DELETE	Registro eliminado: upao test	2025-08-22 13:04:40.070882	4	admin	{"codigo":"upao test","cliente":"UPAO","equipo":"equipo-test","anclaje_equipos":null,"codigo_placa":null,"fv_anios":1,"fv_meses":1,"fecha_instalacion":"2025-08-01","longitud":80,"observaciones":"testeando","seec":"seec002","tipo_linea":"permanente_vertical","ubicacion":"ayni test","fecha_caducidad":"2026-08-31","estado_actual":"ACTIVO"}	\N	\N	t	upao test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
10	\N	UPDATE	Registro placa actualizado: Equipo, Meses de Vida Útil	2025-08-19 00:20:13.474581	4	admin	{"codigo":"placa","cliente":"UPAO","equipo":"placa","anclaje_equipos":"anclaje","codigo_placa":"plc","fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	{"codigo":"placa","cliente":"UPAO","equipo":"ayni-placa","anclaje_equipos":"anclaje","codigo_placa":"plc","fv_anios":1,"fv_meses":0,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	["equipo","fv_meses"]	t	placa	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
32	\N	DELETE	Registro eliminado: placa	2025-08-22 13:04:34.945593	4	admin	{"codigo":"placa","cliente":"UPAO","equipo":"ayni-placa","anclaje_equipos":"anclaje","codigo_placa":"plc","fv_anios":1,"fv_meses":0,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"test","seec":"area","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	\N	\N	t	placa	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
34	\N	DELETE	Registro eliminado: jorge	2025-08-22 13:06:28.037117	4	admin	{"codigo":"jorge","cliente":"Cartavio","equipo":"equipo jorge","anclaje_equipos":null,"codigo_placa":null,"fv_anios":2,"fv_meses":3,"fecha_instalacion":"2025-08-01","longitud":100,"observaciones":"testing","seec":"seec j","tipo_linea":"permanente_vertical","ubicacion":"test","fecha_caducidad":"2027-10-31","estado_actual":"ACTIVO"}	\N	\N	t	jorge	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
35	\N	DELETE	Registro eliminado: test	2025-08-22 13:06:31.679139	4	admin	{"codigo":"test","cliente":"UPAO","equipo":"test","anclaje_equipos":null,"codigo_placa":null,"fv_anios":1,"fv_meses":1,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"dsd","seec":"test","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-08-31","estado_actual":"ACTIVO"}	\N	\N	t	test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
36	\N	DELETE	Registro eliminado: alerta	2025-08-22 13:06:45.394261	4	admin	{"codigo":"alerta","cliente":"UPAO","equipo":"alerta-equipo","anclaje_equipos":null,"codigo_placa":null,"fv_anios":null,"fv_meses":null,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"kfdjsbfj","seec":"seec","tipo_linea":"permanente_horizontal","ubicacion":"ayni","fecha_caducidad":"2025-08-03","estado_actual":"VENCIDO"}	\N	\N	t	alerta	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
37	\N	DELETE	Registro eliminado: alert-cod-test	2025-08-22 13:06:51.540633	4	admin	{"codigo":"alert-cod-test","cliente":"UPAO","equipo":"equipo-alerta","anclaje_equipos":null,"codigo_placa":null,"fv_anios":null,"fv_meses":null,"fecha_instalacion":"2025-08-01","longitud":90,"observaciones":"alertas","seec":"seec-alerta","tipo_linea":"permanente_horizontal","ubicacion":"ayni","fecha_caducidad":"2025-08-03","estado_actual":"VENCIDO"}	\N	\N	t	alert-cod-test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
38	\N	DELETE	Registro eliminado: cod-test-jhoel	2025-08-22 13:06:55.830804	4	admin	{"codigo":"cod-test-jhoel","cliente":"UPAO","equipo":"imagen v2","anclaje_equipos":"anclaje v2","codigo_placa":null,"fv_anios":10,"fv_meses":0,"fecha_instalacion":"2025-08-01","longitud":70,"observaciones":"descripción","seec":"linea","tipo_linea":"temporal_horizontal","ubicacion":"ayni","fecha_caducidad":"2035-07-31","estado_actual":"ACTIVO"}	\N	\N	t	cod-test-jhoel	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
39	\N	DELETE	Registro eliminado: unt test	2025-08-22 13:07:00.700767	4	admin	{"codigo":"unt test","cliente":"Chimu","equipo":"unt equipo","anclaje_equipos":null,"codigo_placa":null,"fv_anios":1,"fv_meses":0,"fecha_instalacion":"2025-08-01","longitud":30,"observaciones":"testing","seec":"seec","tipo_linea":"permanente_horizontal","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	\N	\N	t	unt test	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
40	\N	DELETE	Registro eliminado: unt test 2	2025-08-22 13:07:10.157672	4	admin	{"codigo":"unt test 2","cliente":"Universidad Nacional de Trujillo (UNT)","equipo":"equipo unt test","anclaje_equipos":null,"codigo_placa":null,"fv_anios":1,"fv_meses":null,"fecha_instalacion":"2025-08-01","longitud":80,"observaciones":"testing","seec":"seec 2","tipo_linea":"temporal_horizontal","ubicacion":"ayni","fecha_caducidad":"2026-07-31","estado_actual":"ACTIVO"}	\N	\N	t	unt test 2	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
41	194	CREATE	Registro creado: imagen	2025-08-22 15:42:21.258052	4	admin	\N	{"codigo":"imagen","cliente":"UPAO","equipo":"equipo","anclaje_equipos":"test","codigo_placa":"imagen","fv_anios":1,"fv_meses":1,"fecha_instalacion":"2025-08-01","longitud":50,"observaciones":"test","seec":"test","tipo_linea":"permanente_vertical","ubicacion":"ayni","fecha_caducidad":"2026-09-01T00:00:00.000Z","estado_actual":"ACTIVO"}	["codigo","cliente","equipo","anclaje_equipos","codigo_placa","fv_anios","fv_meses","fecha_instalacion","longitud","observaciones","seec","tipo_linea","ubicacion","fecha_caducidad","estado_actual"]	t	imagen	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
42	194	IMAGE_UPLOAD	Imagen subida: cronograma_sprint2_fechas_reales.png (146KB)	2025-08-22 15:42:42.797272	4	admin	\N	{"filename":"427627dd-2494-439b-a9b3-eac959219b57.jpeg","size":150005,"originalName":"cronograma_sprint2_fechas_reales.png"}	\N	t	imagen	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0
43	194	UPDATE	Longitud actualizado: "50" → "10"	2025-08-23 00:28:38.418854	4	admin	{"longitud":50}	{"longitud":10}	["longitud"]	t	imagen	\N	\N	\N
44	194	UPDATE	Longitud actualizado: "10" → "20"	2025-08-23 00:54:27.761747	4	admin	{"longitud":10}	{"longitud":20}	["longitud"]	t	imagen	\N	\N	\N
45	194	UPDATE	Longitud actualizado: "20" → "8"	2025-08-23 01:55:51.977522	4	admin	{"longitud":20}	{"longitud":8}	["longitud"]	t	imagen	\N	\N	\N
\.


--
-- Data for Name: record_relationships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.record_relationships (id, parent_record_id, child_record_id, relationship_type, notes, created_at, created_by) FROM stdin;
\.


--
-- Data for Name: registro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.registro (id, codigo, cliente, equipo, fv_anios, fv_meses, fecha_instalacion, longitud, observaciones, seec, tipo_linea, ubicacion, fecha_caducidad, estado_actual, anclaje_equipos, codigo_placa) FROM stdin;
2	ALQ-AC	SIDER PERÚ	GRÚA PUENTE	1	0	2022-03-01	0	MTTO. TROLLEY	ACERÍA	OBLÍCUAS	LABORATORIO QUÍMICO.(ASESORAMIENTO CALIDAD)	\N	\N	\N	\N
3	C-VJS-T1	NEXA	ESCALERAS VERTICALES	1	1	2021-10-27	6		JS	VERTICALES	CENTRO DE ENTRENAMIENTO JS (CADENA) - TRAMO 1	\N	\N	\N	\N
4	C-VJS-T2	NEXA	ESCALERAS VERTICALES	1	1	2021-10-27	6		JS	VERTICALES	CENTRO DE ENTRENAMIENTO JS (CADENA) - TRAMO 2	\N	\N	\N	\N
5	C104/105-40	NEXA	EQUIPOS DE PROCESO	3	8	2019-04-03	19.5		40	HORIZONTALES	CANALETA 104 105	\N	\N	\N	\N
6	C2-35-T1	NEXA	EQUIPOS DE PROCESO	5	7	2017-05-16	7		35	HORIZONTALES	CALDERA 02 - TRAMO 1	\N	\N	\N	\N
7	C2-35-T2	NEXA	EQUIPOS DE PROCESO	5	7	2017-05-16	7		35	HORIZONTALES	CALDERA 02 - TRAMO 2	\N	\N	\N	\N
8	C2-35-T3	NEXA	EQUIPOS DE PROCESO	5	7	2017-05-16	7		35	HORIZONTALES	CALDERA 02 - TRAMO 3	\N	\N	\N	\N
9	C2-35-T4	NEXA	EQUIPOS DE PROCESO	5	7	2017-05-16	7		35	HORIZONTALES	CALDERA 02 - TRAMO 4	\N	\N	\N	\N
10	C2-35-T5	NEXA	EQUIPOS DE PROCESO	5	7	2017-05-16	7		35	HORIZONTALES	CALDERA 02 - TRAMO 5	\N	\N	\N	\N
11	C25-93-T1	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-22	10.5		93	HORIZONTALES	CELDA X 25 - TRAMO 1	\N	\N	\N	\N
12	C25-93-T2	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-22	10.5		93	HORIZONTALES	CELDA X 25 - TRAMO 2	\N	\N	\N	\N
13	C26-93-T1	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-23	10.5		93	HORIZONTALES	CELDA X 26 - TRAMO 1	\N	\N	\N	\N
14	C26-93-T2	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-23	10.5		93	HORIZONTALES	CELDA X 26 - TRAMO 2	\N	\N	\N	\N
15	C27-93-T1	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-24	10.5		93	HORIZONTALES	CELDA X 27 - TRAMO 1	\N	\N	\N	\N
16	C27-93-T2	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-24	10.5		93	HORIZONTALES	CELDA X 27 - TRAMO 2	\N	\N	\N	\N
17	C29-93-T1	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-16	10.5		93	HORIZONTALES	CELDA X 29 - TRAMO 1	\N	\N	\N	\N
18	C29-93-T2	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-17	10.5		93	HORIZONTALES	CELDA X 29 - TRAMO 2	\N	\N	\N	\N
19	C30-93-T1	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-20	10.5		93	HORIZONTALES	CELDA X 30 - TRAMO 1	\N	\N	\N	\N
20	C30-93-T2	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-21	10.5		93	HORIZONTALES	CELDA X 30 - TRAMO 2	\N	\N	\N	\N
21	C55-LH	NEXA	EQUIPOS DE PROCESO	1	0	2021-12-02	25	OC: 45144496044	55	HORIZONTALES	CANALON 55	\N	\N	\N	\N
22	CCCH-50-T1	NEXA	EQUIPOS DE PROCESO	4	2	2018-11-30	6		50	HORIZONTALES	CANALETA SOBRE LA COPA DE CHAMPAN	\N	\N	\N	\N
23	CCCH-50-T2	NEXA	EQUIPOS DE PROCESO	4	2	2018-11-30	14		50	HORIZONTALES	CANALETA SOBRE LA COPA DE CHAMPAN	\N	\N	\N	\N
24	CCCH-50-T3	NEXA	EQUIPOS DE PROCESO	4	2	2018-11-30	12		50	HORIZONTALES	CANALETA SOBRE LA COPA DE CHAMPAN	\N	\N	\N	\N
25	CE-HJS-C	NEXA	CENTRO DE ENTRENAMIENTO JS (CADENA)	1	2	2022-10-27	5		JS	HORIZONTALES	TRAMO 1	\N	\N	\N	\N
26	CE023-T1	NEXA	EQUIPOS DE PROCESO	4	0	2018-12-07	5.5		50	HORIZONTALES	CANALETA E023	\N	\N	\N	\N
27	CE023-T2	NEXA	EQUIPOS DE PROCESO	4	0	2018-12-07	4		50	HORIZONTALES	CANALETA E023	\N	\N	\N	\N
28	CX28-93-T1	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-14	10.5		93	HORIZONTALES	CELDA X 28 - TRAMO 1	\N	\N	\N	\N
29	CX28-93-T2	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-15	10.5		93	HORIZONTALES	CELDA X 28 - TRAMO 2	\N	\N	\N	\N
30	ECD2358	NEXA	EQUIPOS DE PROCESO	4	0	2018-12-27	6.5		40/41	HORIZONTALES	ELEVADOR DE CALCINA D 2358	\N	\N	\N	\N
31	ECD2359	NEXA	EQUIPOS DE PROCESO	4	0	2018-12-27	6.5		40/41	HORIZONTALES	ELEVADOR DE CALCINA D 2359	\N	\N	\N	\N
32	EGP1020-73	NEXA	GRÚAS	1	7	2022-09-08	8		73	HORIZONTALES	AREA DE ELECTROLISIS - G.P 1020	\N	\N	\N	\N
33	EGP114-75	NEXA	GRÚAS	1	7	2022-09-08	5.5		75	HORIZONTALES	AREA DE ELECTROLISIS - G.P 114	\N	\N	\N	\N
34	EV/LA/D1	SIDER PERÚ	ESCALERAS VERTICALES	4	0	2019-01-01	7		LARGOS	VERTICALES	GRÚA PÓRTICO - TRAMO 1	\N	\N	\N	\N
35	EV/LA/D2	SIDER PERÚ	ESCALERAS VERTICALES	4	0	2019-01-01	9		LARGOS	VERTICALES	GRÚA PÓRTICO - TRAMO 2	\N	\N	\N	\N
36	EV/N2/FH/LV	SIDER PERÚ	ESCALERAS VERTICALES	6	0	2017-01-01	9		LIMA	VERTICALES	NAVE 2 DE FIERRO HABILITADO	\N	\N	\N	\N
37	EV/N2/LL	SIDER PERÚ	ESCALERAS VERTICALES	6	0	2017-01-01	12		LIMA	VERTICALES	NAVE 2 DE LOGÍSTICA	\N	\N	\N	\N
38	EV/N3/FH/LO	SIDER PERÚ	ESCALERAS VERTICALES	6	0	2017-01-01	12		LIMA	VERTICALES	NAVE 3 DE LOGÍSTICA	\N	\N	\N	\N
39	EV/N3/FH/LV	SIDER PERÚ	ESCALERAS VERTICALES	6	0	2017-01-01	8.5		LIMA	VERTICALES	NAVE 3 DE FIERRO HABILITADO	\N	\N	\N	\N
40	FD1016-40/10	NEXA	EQUIPOS DE PROCESO	4	0	2019-11-26	12		40/10	HORIZONTALES	FILTRO D 1016	\N	\N	\N	\N
41	FD1017-40/10	SIDER PERÚ	EQUIPOS DE PROCESO	4	0	2019-11-26	12		40/10	HORIZONTALES	FILTRO D 1017	\N	\N	\N	\N
42	FD1117.40/10	NEXA	CENTRO DE ENTRENAMIENTO JS (ADENA)	3	1	2019-11-14	12	OC: 4512785765	40/10	HORIZONTALES	FILTRO D1117	\N	\N	\N	\N
43	FD2323-40/10	NEXA	EQUIPOS DE PROCESO	3	9	2019-03-15	6		40/10	HORIZONTALES	FILTRO D 2323	\N	\N	\N	\N
44	FD2323.40/10	NEXA	CENTRO DE ENTRENAMIENTO JS (CADENA)	3	10	2019-02-07	12	OC: 4512042596	40/10	HORIZONTALES	FILTRO D 2323	\N	\N	\N	\N
45	FI2121-41-LD	NEXA	EQUIPOS DE PROCESO	3	9	2019-03-15	6		41	HORIZONTALES	FILTRO I 2121 LADO DERECHO	\N	\N	\N	\N
46	FI2121-41-LI	NEXA	EQUIPOS DE PROCESO	3	9	2019-03-15	6		41	HORIZONTALES	FILTRO I 2121 LADO IZQUIERDO	\N	\N	\N	\N
47	FI2121.41	NEXA	CENTRO DE ENTRNAMIENTO JS (CADENA)	3	10	2019-02-07	12	OC: 4512042596	41	HORIZONTALES	FILTRO I 2121	\N	\N	\N	\N
48	LA-GPL13A-T1	SIDER PERÚ	VIGAS CARRILERAS	4	0	2019-01-01	24		LARGOS	HORIZONTALES	GRÚA PÓRTICO L13A - TRAMO 1	\N	\N	\N	\N
49	LA-GPL13A-T2	SIDER PERÚ	VIGAS CARRILERAS	4	0	2019-01-01	24		LARGOS	HORIZONTALES	GRÚA PÓRTICO L13A - TRAMO 2	\N	\N	\N	\N
50	LA-GPL13A-T3	SIDER PERÚ	VIGAS CARRILERAS	4	0	2019-01-01	12.5		LARGOS	HORIZONTALES	GRÚA PÓRTICO L13A - TRAMO 3	\N	\N	\N	\N
51	LA-N1-EA-T4	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	70		LARGOS	HORIZONTALES	NAVE 1 EJE "A" - TRAMO 4	\N	\N	\N	\N
52	LA-N1-EB-T1	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	25		LARGOS	HORIZONTALES	NAVE 1 EJE "B" - TRAMO 1	\N	\N	\N	\N
53	LA-N1-EB-T2	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	45.5		LARGOS	HORIZONTALES	NAVE 1 EJE "B" - TRAMO 2	\N	\N	\N	\N
54	LA-N1-EB-T3	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	14		LARGOS	HORIZONTALES	NAVE 1 EJE "B" - TRAMO 3	\N	\N	\N	\N
55	LA-N1-EB-T4	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	40.5		LARGOS	HORIZONTALES	NAVE 1 EJE "B" - TRAMO 4	\N	\N	\N	\N
56	LA-N1-EB-T5	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	75		LARGOS	HORIZONTALES	NAVE 1 EJE "B" - TRAMO 5	\N	\N	\N	\N
57	LA-N1-EB-T6	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	17.5		LARGOS	HORIZONTALES	NAVE 1 EJE "B" - TRAMO 6	\N	\N	\N	\N
58	LA-N2-EB-T1	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	62.5		LARGOS	HORIZONTALES	NAVE 2 EJE "B" - TRAMO 1	\N	\N	\N	\N
59	LA-N2-EC-T1	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	32.5		LARGOS	HORIZONTALES	NAVE 2 EJE "C" - TRAMO 1	\N	\N	\N	\N
60	LA-N2-EC-T2	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	100		LARGOS	HORIZONTALES	NAVE 2 EJE "C" - TRAMO 2	\N	\N	\N	\N
61	LA-N2-EC-T3	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	75		LARGOS	HORIZONTALES	NAVE 2 EJE "C" - TRAMO 3	\N	\N	\N	\N
62	LA-N3-ED-T1	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	100		LARGOS	HORIZONTALES	NAVE 3 EJE "D" - TRAMO 1	\N	\N	\N	\N
63	LA-N3-ED-T2	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	30		LARGOS	HORIZONTALES	NAVE 3 EJE "D" - TRAMO 2	\N	\N	\N	\N
64	LA-N3-LA-T1	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	12.5		LARGOS	HORIZONTALES	NAVE 3 EJE "C" - TRAMO 1	\N	\N	\N	\N
65	LA-N3-LA-T2	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	31.5		LARGOS	HORIZONTALES	NAVE 3 EJE "C" - TRAMO 2	\N	\N	\N	\N
66	LA-N4-ED-T1	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	100		LARGOS	HORIZONTALES	NAVE 4 - TRAMO 1	\N	\N	\N	\N
67	LA-N4-ED-T2	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	102		LARGOS	HORIZONTALES	NAVE 4 - TRAMO 2	\N	\N	\N	\N
68	LA-N5-ED-T1	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	48		LARGOS	HORIZONTALES	NAVE 5 - TRAMO 1	\N	\N	\N	\N
69	LA-N5-ED-T2	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	86		LARGOS	HORIZONTALES	NAVE 5 - TRAMO 2	\N	\N	\N	\N
70	LA-N5-ED-T3	SIDER PERÚ	VIGAS CARRILERAS	1	0	2021-12-01	27		LARGOS	HORIZONTALES	NAVE 5 - TRAMO 3	\N	\N	\N	\N
71	LHP GP2133	NEXA	GRÚAS	1	7	2022-09-08	11	OC:4515362527 Se trabajo para JS	75	HORIZONTALES	SECC. ELECTROLISIS - G.P 2133	\N	\N	\N	\N
72	LLB-1-21	SIDER PERÚ	VIGAS CARRILERAS	1	5	2021-08-01	76	OC: 3007322112	LARGOS	HORIZONTALES	NAVE 2 LAMINACIÓN LARGOS EJE "B"	\N	\N	\N	\N
73	LVH-A8-1-50	SIDER PERÚ	VIGAS CARRILERAS	4	0	2019-04-01	50	OC: 3005637099	LOGÍSTICA	HORIZONTALES	ALMACEN 8	\N	\N	\N	\N
74	LVH-A9-1-50	SIDER PERÚ	VIGAS CARRILERAS	4	0	2019-04-01	50	OC: 3005637099	LOGÍSTICA	HORIZONTALES	ALMACEN 9	\N	\N	\N	\N
75	LVHS C 2002-1	NEXA	ESCALERAS VERTICALES	3	7	2019-05-23	4		34	HORIZONTALES	SILO C2002 1ER TRAMO	\N	\N	\N	\N
76	LVHS C 2002-2	NEXA	ESCALERAS VERTICALES	3	7	2019-05-23	4		34	HORIZONTALES	SILO C2002 2DO TRAMO	\N	\N	\N	\N
77	LVHS C 506-1	NEXA	ESCALERAS VERTICALES	3	7	2019-05-23	5		34	HORIZONTALES	SILO C506 1ER TRAMO	\N	\N	\N	\N
78	LVHS C 506-2	NEXA	ESCALERAS VERTICALES	3	7	2019-05-23	5		34	HORIZONTALES	SILO C506 2DO TRAMO	\N	\N	\N	\N
79	LVST14-LE4	SIDER PERÚ	VIGAS CARRILERAS	4	0	2019-10-01	77.6	OC: 3005999583	LOGÍSTICA	HORIZONTALES	NAVE ST 14-TRAMO 4	\N	\N	\N	\N
80	LVVP - 025	NEXA	ESCALERAS VERTICALES	3	2	2019-10-29	7.5		32	VERTICALES	TK ACIDO 1ER TRAMO 025	\N	\N	\N	\N
81	LVVP - 026	NEXA	ESCALERAS VERTICALES	3	2	2019-10-29	8		32	VERTICALES	TK ACIDO 2DO TRAMO 026	\N	\N	\N	\N
82	LVVP - 027	NEXA	ESCALERAS VERTICALES	3	1	2019-11-26	7.5		32	VERTICALES	TK DE ACIDO 027	\N	\N	\N	\N
83	LVVP - 028	NEXA	ESCALERAS VERTICALES	3	1	2019-11-19	8.5		32	VERTICALES	TK DE ACIDO 028	\N	\N	\N	\N
84	LVVP C 506	NEXA	EQUIPOS DE PROCESO	3	6	2019-06-24	11	Se realizo Mtto 23.12.22	34	VERTICALES	SILO C506 1ER TRAMO	\N	\N	\N	\N
85	LVVP C 506 - 2	NEXA	EQUIPOS DE PROCESO	3	6	2019-06-24	8	Se readecuo: 23.12.22	34	VERTICALES	SILO C506 2DO TRAMO	\N	\N	\N	\N
86	LVVP C2002	NEXA	EQUIPOS DE PROCESO	3	6	2019-06-24	11	Se realizo Mtto: 23.12.22	34	VERTICALES	SILO C2002 1ER TRAMO	\N	\N	\N	\N
87	LVVP C2002 - 2	NEXA	EQUIPOS DE PROCESO	3	6	2019-06-24	13	Se readecuo: 23.12.22	34	VERTICALES	SILO C2002 2DO TRAMO	\N	\N	\N	\N
88	PC-93-T1	NEXA	EQUIPOS DE PROCESO	1	3	2021-09-10	8		93	HORIZONTALES	PLATAFORMA DE CAMIONES/VAGONES - TRAMO 1	\N	\N	\N	\N
89	PC-93-T2	NEXA	EQUIPOS DE PROCESO	1	3	2021-09-10	8		93	HORIZONTALES	PLATAFORMA DE CAMIONES/VAGONES - TRAMO 2	\N	\N	\N	\N
90	PC-93-T3	NEXA	EQUIPOS DE PROCESO	1	3	2021-09-10	8		93	HORIZONTALES	PLATAFORMA DE CAMIONES/VAGONES - TRAMO 3	\N	\N	\N	\N
91	PC-LB.	NEXA	CENTRO DE ENTRENAMIENTO JS (CADENA)	3	4	2019-08-12	7		LAB.NEXA	HORIZONTALES	PLATAFORMA DE CAMIONES/VAGONES	\N	\N	\N	\N
92	PG/AC-I/8-3	SIDER PERÚ	GRÚA PUENTE	4	0	2019-03-01	18.4	Año 2013 se instaló 46m//OC: 3005685162	ACERÍA	HORIZONTALES	EJE "Z" GRÚA 8-3 INTERIOR DE PLANTA	\N	\N	\N	\N
93	PG/AC-I/8-7	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	45		ACERÍA	HORIZONTALES	GRÚA 8 - 7 INTERIOR DE PLANTA	\N	\N	\N	\N
94	PG/AC-I/AC-2	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	45		ACERÍA	HORIZONTALES	GRÚA AC-2 INTERIOR DE PLANTA	\N	\N	\N	\N
95	PG/AC-P	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	32		ACERÍA	HORIZONTALES	PÓRTICOS(COMPACTADOR DE CHATARRA)	\N	\N	\N	\N
96	PG/AC/AC-1	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	45		ACERÍA	HORIZONTALES	GRÚA AC-1 INTERIOR DE PLANTA	\N	\N	\N	\N
97	PG/AC/PP/8-6A	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	69		ACERIA 	HORIZONTALES	GRÚA 8-6A, PARQUE DE PALANQUIAS	\N	\N	\N	\N
98	PG/AC/PP/8-6B	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	66		ACERIA 	HORIZONTALES	GRÚA 8-6B, PARQUE DE PALANQUIAS	\N	\N	\N	\N
99	PG/ACE/PCCH/8-4	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	58		ACERÍA	HORIZONTALES	GRÚA 8-4 PARQUE CESTAS DE CHATARRA	\N	\N	\N	\N
100	PG/ACE/PCCH/8-5	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	58		ACERÍA	HORIZONTALES	GRÚA 8-5 PARQUE CESTAS DE CHATARRA	\N	\N	\N	\N
101	PG/LA/ME1/L-10	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	63		LARGOS	OBLÍCUAS	GRUA L 10 MESA DE ENFRIAMIENTO 1	\N	\N	\N	\N
102	PG/LA/ME1/L-11	SIDER PERÚ	GRÚA PUENTE	1	0	2021-12-01	54		LARGOS	HORIZONTALES	GRUA L 11 MESA DE ENFRIAMIENTO 1	\N	\N	\N	\N
103	PG/LA/ME2/L-17	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	50		LARGOS	OBLÍCUAS	GRUA L/17 MESA DE ENFRIAMIENTO 2 NAVE 5	\N	\N	\N	\N
104	PG/LA/ME3/25/L-16	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	50		LARGOS	OBLÍCUAS	GRÚA - L-16 MESA DE ENFRIAMIENTO 2.2 DA SECC: ZONA TRANSF	\N	\N	\N	\N
105	PG/LA/N1/L3	SIDER PERÚ	GRÚA PUENTE	1	0	2021-12-01	50		LARGOS	HORIZONTALES	GRUA L3 NAVE 1 EJE "B"	\N	\N	\N	\N
106	PG/LA/N2/L4-T1	SIDER PERÚ	GRÚA PUENTE	1	0	2021-12-01	32		LARGOS	HORIZONTALES	GRUA L4 NAVE 2 EJE "C" TRAMO 1	\N	\N	\N	\N
107	PG/LA/N2/L4-T2	SIDER PERÚ	GRÚA PUENTE	1	0	2021-12-01	50		LARGOS	HORIZONTALES	GRUA L4 NAVE 2 EJE "C" TRAMO 2	\N	\N	\N	\N
108	PG/LA/N3/L-5A	SIDER PERÚ	GRÚA PUENTE	1	0	2021-12-01	60		LARGOS	HORIZONTALES	GRUA L 5 - A NAVE 3 EJE "D"	\N	\N	\N	\N
109	PG/LA/N3/L-6	SIDER PERÚ	GRÚA PUENTE	1	0	2021-12-01	41		LARGOS	HORIZONTALES	GRUA L 6 NAVE 3 EJE "D"	\N	\N	\N	\N
110	PG/LA/N3/L5-5	SIDER PERÚ	GRÚA PUENTE	1	0	2021-12-01	50		LARGOS	HORIZONTALES	GRUA L5 NAVE 3 EJE "D"	\N	\N	\N	\N
111	PG/LA/TE/L-9	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	55		LARGOS	HORIZONTALES	GRÚA L-9, TALLER ELÉCTRICO	\N	\N	\N	\N
112	PG/LA/TFM/L-7	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	55		LARGOS	HORIZONTALES	GRÚA L-7, TALLER FABRICACIONES METALICAS	\N	\N	\N	\N
113	PG/LA/TM/L-8	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	55		LARGOS	HORIZONTALES	GRÚA L-8, TALLER MECÁNICO	\N	\N	\N	\N
114	PG/LG	SIDER PERÚ	GRÚA PUENTE	8	0	2015-01-01	15		LIMA	HORIZONTALES	NAVE 1	\N	\N	\N	\N
115	PG/LG 2	SIDER PERÚ	GRÚA PUENTE	8	0	2015-01-01	22		LIMA	HORIZONTALES	NAVE 2	\N	\N	\N	\N
116	PG/TB/D/E	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	67		TUBOS	HORIZONTALES	GRÚA E	\N	\N	\N	\N
117	PG/TB/D/E-1	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	67		TUBOS	HORIZONTALES	GRÚA E-1	\N	\N	\N	\N
118	PG/TB/GT-1	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	53		TUBOS	HORIZONTALES	GRÚA DE TUBOS	\N	\N	\N	\N
119	PG/TB/GT-2	SIDER PERÚ	GRÚA PUENTE	10	0	2013-01-01	53		TUBOS	HORIZONTALES	GRÚA DE TUBOS	\N	\N	\N	\N
120	SC/T1/	SIDER PERÚ	ESCALERAS VERTICALES	1	0	2022-04-01	8	OC: 3008035348	ACERÍA	VERTICALES	SALA DE COMPRESORAS	\N	\N	\N	\N
121	T1/C251	NEXA	ESCALERAS VERTICALES	2	9	2021-03-26	0	OC: 0029-20	32	VERTICALES	TK DE ACIDO C251 TRAMO 1	\N	\N	\N	\N
122	T2/C251	NEXA	ESCALERAS VERTICALES	2	9	2021-03-26	0		32	VERTICALES	TK DE ACIDO C251 TRAMO 2	\N	\N	\N	\N
123	TK-32-LV	NEXA	ESCALERAS VERTICALES	3	1	2019-11-29	16	OC: 4512909068	32	VERTICALES	TK DE ACIDO 	\N	\N	\N	\N
124	TX501	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-24	9.5		93	HORIZONTALES	T.E X500 - TRAMO 1	\N	\N	\N	\N
125	TX502	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-24	9.5		93	HORIZONTALES	T.E X500 - TRAMO 2	\N	\N	\N	\N
126	TX503	NEXA	EQUIPOS DE PROCESO	3	7	2019-05-24	9.5		93	HORIZONTALES	T.E X500 - TRAMO 3	\N	\N	\N	\N
127	VR/	SIDER PERÚ	ESCALERAS VERTICALES	1	5	2021-05-01	7.5		LARGOS	VERTICALES	T.E CIRCUÍTO "D" TRAMO 2	\N	\N	\N	\N
128	VR/AC/CO	SIDER PERÚ	VIGAS CARRILERAS	9	0	2014-01-01	255		ACERÍA	HORIZONTALES	VIGA RIEL DE COLADO  	\N	\N	\N	\N
129	VR/AC/HE	SIDER PERÚ	VIGAS CARRILERAS	9	0	2014-01-01	200		ACERÍA	HORIZONTALES	VIGA RIEL DE HORNO ELÉCTRICO  	\N	\N	\N	\N
130	VR/AC/PCCH	SIDER PERÚ	VIGAS CARRILERAS	9	0	2014-01-01	115		ACERÍA	HORIZONTALES	VIGA RIEL DE PARQUE CESTA CHATARRA	\N	\N	\N	\N
131	VR/AC/PP	SIDER PERÚ	VIGAS CARRILERAS	9	0	2014-01-01	277		ACERÍA	HORIZONTALES	VIGA RIEL DE PARQUE DE PALANQUIAS	\N	\N	\N	\N
132	VR/CE/	SIDER PERÚ	ESCALERAS VERTICALES	1	5	2021-05-01	9	OC: 3006784097	LIMA	VERTICALES	T.E CIRCUÍTO "D" TRAMO 1	\N	\N	\N	\N
133	VR/LA N1/H-01	SIDER PERÚ	VIGAS CARRILERAS	4	0	2019-08-01	37.5		LARGOS	HORIZONTALES	NAVE 1 LAMINACIÓN LARGO - TRAMO 1	\N	\N	\N	\N
134	VR/LA N1/H-02	SIDER PERÚ	VIGAS CARRILERAS	4	0	2019-08-01	69		LARGOS	HORIZONTALES	NAVE 1 LAMINACIÓN LARGO - TRAMO 2	\N	\N	\N	\N
135	VR/LA N1/H-03	SIDER PERÚ	VIGAS CARRILERAS	4	0	2019-08-01	37.5		LARGOS	HORIZONTALES	NAVE 1 LAMINACIÓN LARGO - TRAMO 3	\N	\N	\N	\N
136	VR/LA N1/H-04	SIDER PERÚ	VIGAS CARRILERAS	4	0	2019-08-01	69		LARGOS	HORIZONTALES	NAVE 1 LAMINACIÓN LARGO - TRAMO 4	\N	\N	\N	\N
137	VR/LA/TE	SIDER PERÚ	VIGAS CARRILERAS	10	0	2013-01-01	77		LARGOS	HORIZONTALES	VIGA RIEL DE TALLER ELÉCTRICO	\N	\N	\N	\N
138	VR/LA/TFM	SIDER PERÚ	VIGAS CARRILERAS	10	0	2013-01-01	77		LARGOS	HORIZONTALES	VIGA RIEL DE TALLER DE FABRICACIONES METÁLICAS	\N	\N	\N	\N
139	VR/LA/TM	SIDER PERÚ	VIGAS CARRILERAS	10	0	2013-01-01	77		LARGOS	HORIZONTALES	VIGA RIEL DE TALLER MECÁNICO	\N	\N	\N	\N
140	VR/LM/FH-1	SIDER PERÚ	VIGAS CARRILERAS	9	0	2014-01-01	155		LIMA	HORIZONTALES	FIERRO HABILITADO 1	\N	\N	\N	\N
141	VR/LM/FH2A	SIDER PERÚ	VIGAS CARRILERAS	9	0	2014-01-01	88		LIMA	HORIZONTALES	FIERRO HABILITADO 2 - A	\N	\N	\N	\N
142	VR/LM/FH2B	SIDER PERÚ	VIGAS CARRILERAS	9	0	2014-01-01	78		LIMA	HORIZONTALES	FIERRO HABILITADO 2 - B	\N	\N	\N	\N
143	VR/LM/LG	SIDER PERÚ	VIGAS CARRILERAS	9	0	2014-01-01	155		LIMA	HORIZONTALES	LOGÍSTICA 	\N	\N	\N	\N
144	VR/N/B23	SIDER PERÚ	ESCALERAS VERTICALES	8	0	2017-01-01	12.5		PLANOS	VERTICALES	ESCALERA B 23 DE DECAPADO	\N	\N	\N	\N
145	VR/N2/LV/B24	SIDER PERÚ	ESCALERAS VERTICALES	8	0	2017-01-01	12.5		PLANOS	VERTICALES	ESCALERA B 23 DE DECAPADO	\N	\N	\N	\N
146	VR/PD/D/B	SIDER PERÚ	VIGAS CARRILERAS	9	0	2014-01-01	300		PLANOS Y DERIVADOS	HORIZONTALES	DECAPADO COLUMNA B23 A B45	\N	\N	\N	\N
147	VR/TB/NPL-LD	SIDER PERÚ	VIGAS CARRILERAS	9	0	2014-01-01	365		PLANOS Y DERIVADOS	HORIZONTALES	NAVE DE PLANOS - LADO DERECHO	\N	\N	\N	\N
148	VR/TB/NPL-LI	SIDER PERÚ	VIGAS CARRILERAS	9	0	2014-01-01	365		PLANOS Y DERIVADOS	HORIZONTALES	NAVE DE PLANOS- LADO IZQUIERDO	\N	\N	\N	\N
149	VR/TB/NTV	SIDER PERÚ	VIGAS CARRILERAS	9	0	2014-01-01	254		PLANOS Y DERIVADOS	HORIZONTALES	NAVE TUBOS	\N	\N	\N	\N
150	X	SIDER PERÚ	ESCALERAS VERTICALES	6	0	2017-01-01	8.5		LIMA	VERTICALES	PRODUCCIÓN	\N	\N	\N	\N
1	AGP-812	SIDER PERÚ	GRÚA PUENTE	1	0	2021-12-01	22	OC: 3007952233	ACERÍA	HORIZONTALES	GRÚA PUENTE 8/12	2022-11-30	VENCIDO	\N	\N
194	imagen	UPAO	equipo	1	1	2025-08-01	8	test	test	permanente_vertical	ayni	2026-08-31	ACTIVO	test	imagen
\.


--
-- Data for Name: registro_estado_historial; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.registro_estado_historial (id, registro_id, fecha_cambio, observacion, estado) FROM stdin;
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, usuario, apellidos, cargo, celular, contrasenia, email, empresa, nombre, rol) FROM stdin;
1	admin5	LEZAMA	ALAMACEN	6899420913	123	calor1@ayni.com	AYNI	CARLOS	USUARIO
2	jeannyruiz	RUIZ DE LA CRUZ	PRACTICANTE	949208718	minminbello2022	jeannyruiz155@gmail.com	AYNI	JEANNY GISSELL	USUARIO
3	SANDRA	QUISPE	SISTEMAS	999999999	SANDRA	SASAS	AYNI	SANDRA	ADMINISTRADOR
4	admin	del Sistema	Administrador del Sistema	+51 999 999 999	$2b$10$RE5ba4hSjl63bWlMvfYkpe.VW92ASC0H/Q8qtxc2uqp5g1Vj/PfT2	admin@aynic.com	Ayni	Administrador	ADMINISTRADOR
11	jhoel	maqui saldaña	Sistemas	950475258	$2b$10$HqYeP3fcCuaazlA/OBLTyuUaK1E9UyTGSCUuCjBsMHStO7xP.F1jq	jhoneiro12@hotmail.com	Ayni	jhoel	USUARIO
12	usuario	de Prueba	Operador	+51 888 888 888	$2b$10$trfIyp0vF6jo.OUxb6EOlO6pKAaYvJvujF0geWL2U6g3ASI1vExia	usuario@aynic.com	Aynic	Usuario	USUARIO
\.


--
-- Name: accidentes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accidentes_id_seq', 2, true);


--
-- Name: alertas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alertas_id_seq', 6, true);


--
-- Name: authorization_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.authorization_codes_id_seq', 1, false);


--
-- Name: maintenances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.maintenances_id_seq', 3, true);


--
-- Name: record_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.record_images_id_seq', 15, true);


--
-- Name: record_movement_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.record_movement_history_id_seq', 45, true);


--
-- Name: record_relationships_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.record_relationships_id_seq', 1, false);


--
-- Name: registro_estado_historial_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.registro_estado_historial_id_seq', 8, true);


--
-- Name: registro_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.registro_id_seq', 194, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 12, true);


--
-- Name: accidentes PK_1f0bea3421729a41749c67abb44; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accidentes
    ADD CONSTRAINT "PK_1f0bea3421729a41749c67abb44" PRIMARY KEY (id);


--
-- Name: record_relationships PK_45010d61ed784a741ccb58fbb3a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_relationships
    ADD CONSTRAINT "PK_45010d61ed784a741ccb58fbb3a" PRIMARY KEY (id);


--
-- Name: maintenances PK_62403473bd524a42d58589aa78b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenances
    ADD CONSTRAINT "PK_62403473bd524a42d58589aa78b" PRIMARY KEY (id);


--
-- Name: registro PK_68115a72117fce58864e9bf6509; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registro
    ADD CONSTRAINT "PK_68115a72117fce58864e9bf6509" PRIMARY KEY (id);


--
-- Name: record_movement_history PK_7a05e5e20bcf8bdd92affd258ad; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_movement_history
    ADD CONSTRAINT "PK_7a05e5e20bcf8bdd92affd258ad" PRIMARY KEY (id);


--
-- Name: record_images PK_8da97547c56544ed29d9e60c728; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_images
    ADD CONSTRAINT "PK_8da97547c56544ed29d9e60c728" PRIMARY KEY (id);


--
-- Name: alertas PK_b474c4021f8d6e4e13383ef1106; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT "PK_b474c4021f8d6e4e13383ef1106" PRIMARY KEY (id);


--
-- Name: usuarios PK_d7281c63c176e152e4c531594a8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY (id);


--
-- Name: registro_estado_historial PK_ee9a1628d9b0d1f283a986dbdc1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registro_estado_historial
    ADD CONSTRAINT "PK_ee9a1628d9b0d1f283a986dbdc1" PRIMARY KEY (id);


--
-- Name: authorization_codes PK_f05b2eb99ad2db12d87544656c4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authorization_codes
    ADD CONSTRAINT "PK_f05b2eb99ad2db12d87544656c4" PRIMARY KEY (id);


--
-- Name: usuarios UQ_0790a401b9d234fa921e9aa1777; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT "UQ_0790a401b9d234fa921e9aa1777" UNIQUE (usuario);


--
-- Name: authorization_codes UQ_0dbddae21cb087717e5207a5bd1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authorization_codes
    ADD CONSTRAINT "UQ_0dbddae21cb087717e5207a5bd1" UNIQUE (code);


--
-- Name: registro UQ_82315a4201d01e3c78261e978b9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registro
    ADD CONSTRAINT "UQ_82315a4201d01e3c78261e978b9" UNIQUE (codigo_placa);


--
-- Name: registro UQ_a0bce8e319d1acd1e1762f7ee3b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registro
    ADD CONSTRAINT "UQ_a0bce8e319d1acd1e1762f7ee3b" UNIQUE (codigo);


--
-- Name: IDX_0dbddae21cb087717e5207a5bd; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_0dbddae21cb087717e5207a5bd" ON public.authorization_codes USING btree (code);


--
-- Name: IDX_1dff50e53edeaebefc5e23fe8b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_1dff50e53edeaebefc5e23fe8b" ON public.record_movement_history USING btree (record_id, action_date);


--
-- Name: IDX_4c6b3237e615e093661b4059bb; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_4c6b3237e615e093661b4059bb" ON public.record_movement_history USING btree (action, action_date);


--
-- Name: IDX_6f701e44a796c40cae6f6e9c6d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_6f701e44a796c40cae6f6e9c6d" ON public.record_movement_history USING btree (user_id, action_date);


--
-- Name: IDX_adabb5a0c00f10105bbc67b75e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_adabb5a0c00f10105bbc67b75e" ON public.accidentes USING btree (fecha_accidente);


--
-- Name: IDX_c992d73dd3fed857df16386e63; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_c992d73dd3fed857df16386e63" ON public.record_images USING btree (record_id);


--
-- Name: IDX_c9dfd25de56a6e4ff03020535d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_c9dfd25de56a6e4ff03020535d" ON public.maintenances USING btree (record_id, maintenance_date);


--
-- Name: IDX_ca4888b4ec329dbd07b6c0ce99; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_ca4888b4ec329dbd07b6c0ce99" ON public.alertas USING btree (leida, fecha_creada);


--
-- Name: IDX_cab4a7a91b37c1bb5f22a20d79; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cab4a7a91b37c1bb5f22a20d79" ON public.authorization_codes USING btree (expires_at);


--
-- Name: IDX_dbe72b37da52be99dd788d9a2e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_dbe72b37da52be99dd788d9a2e" ON public.alertas USING btree (tipo, registro_id);


--
-- Name: IDX_e7e430b8c0b34c4a346a36b808; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_e7e430b8c0b34c4a346a36b808" ON public.record_relationships USING btree (parent_record_id);


--
-- Name: IDX_f3819e0f87f16861d36688e625; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_f3819e0f87f16861d36688e625" ON public.accidentes USING btree (linea_vida_id, fecha_accidente);


--
-- Name: IDX_fa6604f985d4168947319c5dd2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_fa6604f985d4168947319c5dd2" ON public.record_relationships USING btree (child_record_id);


--
-- Name: authorization_codes FK_2561d9024f783320dbf9dbdcf5d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authorization_codes
    ADD CONSTRAINT "FK_2561d9024f783320dbf9dbdcf5d" FOREIGN KEY (requested_by_user_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: maintenances FK_2d54960123a1770e06c6c2c2cfe; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenances
    ADD CONSTRAINT "FK_2d54960123a1770e06c6c2c2cfe" FOREIGN KEY (record_id) REFERENCES public.registro(id) ON DELETE CASCADE;


--
-- Name: record_relationships FK_3a3f07c036e242706ff803428a2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_relationships
    ADD CONSTRAINT "FK_3a3f07c036e242706ff803428a2" FOREIGN KEY (created_by) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: record_movement_history FK_451025dd27ab213f64ba7da0bb2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_movement_history
    ADD CONSTRAINT "FK_451025dd27ab213f64ba7da0bb2" FOREIGN KEY (record_id) REFERENCES public.registro(id) ON DELETE SET NULL;


--
-- Name: authorization_codes FK_5bc7f2b21ad358f51a43fa766ca; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authorization_codes
    ADD CONSTRAINT "FK_5bc7f2b21ad358f51a43fa766ca" FOREIGN KEY (authorized_by_user_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: record_images FK_c992d73dd3fed857df16386e636; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_images
    ADD CONSTRAINT "FK_c992d73dd3fed857df16386e636" FOREIGN KEY (record_id) REFERENCES public.registro(id) ON DELETE CASCADE;


--
-- Name: record_images FK_cadd6139d65c3ac8d980760f3bf; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_images
    ADD CONSTRAINT "FK_cadd6139d65c3ac8d980760f3bf" FOREIGN KEY (uploaded_by) REFERENCES public.usuarios(id);


--
-- Name: authorization_codes FK_d9a0016e3a447ae7fe1acfb3a78; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authorization_codes
    ADD CONSTRAINT "FK_d9a0016e3a447ae7fe1acfb3a78" FOREIGN KEY (resource_id) REFERENCES public.registro(id) ON DELETE CASCADE;


--
-- Name: accidentes FK_ded0fa2fb1332e8cba1c46e5db2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accidentes
    ADD CONSTRAINT "FK_ded0fa2fb1332e8cba1c46e5db2" FOREIGN KEY (linea_vida_id) REFERENCES public.registro(id) ON DELETE CASCADE;


--
-- Name: registro_estado_historial FK_e1ba49e8527a5c1676888fefc8e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registro_estado_historial
    ADD CONSTRAINT "FK_e1ba49e8527a5c1676888fefc8e" FOREIGN KEY (registro_id) REFERENCES public.registro(id) ON DELETE CASCADE;


--
-- Name: record_relationships FK_e7e430b8c0b34c4a346a36b808e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_relationships
    ADD CONSTRAINT "FK_e7e430b8c0b34c4a346a36b808e" FOREIGN KEY (parent_record_id) REFERENCES public.registro(id) ON DELETE CASCADE;


--
-- Name: maintenances FK_eb9c1c92e1bce5956c8f07407ea; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenances
    ADD CONSTRAINT "FK_eb9c1c92e1bce5956c8f07407ea" FOREIGN KEY (created_by) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: alertas FK_ef93e24aa6954c0552d3ac65dbc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alertas
    ADD CONSTRAINT "FK_ef93e24aa6954c0552d3ac65dbc" FOREIGN KEY (registro_id) REFERENCES public.registro(id) ON DELETE CASCADE;


--
-- Name: record_movement_history FK_f53a80f064ef566ec4160ced288; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_movement_history
    ADD CONSTRAINT "FK_f53a80f064ef566ec4160ced288" FOREIGN KEY (user_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: accidentes FK_f59e78c4b7a4209592b472d0bbc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accidentes
    ADD CONSTRAINT "FK_f59e78c4b7a4209592b472d0bbc" FOREIGN KEY (reportado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: record_relationships FK_fa6604f985d4168947319c5dd24; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_relationships
    ADD CONSTRAINT "FK_fa6604f985d4168947319c5dd24" FOREIGN KEY (child_record_id) REFERENCES public.registro(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

