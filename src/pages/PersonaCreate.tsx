import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { personaApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Plus, X, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const tones = [
  { value: 'analytical', label: 'Analytical & Direct' },
  { value: 'provocative', label: 'Provocative & Bold' },
  { value: 'friendly', label: 'Friendly & Approachable' },
  { value: 'professional', label: 'Professional & Polished' },
  { value: 'casual', label: 'Casual & Relaxed' },
  { value: 'inspirational', label: 'Inspirational & Motivating' },
];

const visualStyles = [
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'tech', label: 'Tech/Futuristic' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'creative', label: 'Creative' },
  { value: 'bold', label: 'Bold' },
];

export default function PersonaCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [expertiseNodes, setExpertiseNodes] = useState<string[]>([]);
  const [newExpertise, setNewExpertise] = useState('');
  const [experienceVault, setExperienceVault] = useState('');
  const [tone, setTone] = useState('professional');
  const [visualStyle, setVisualStyle] = useState('minimalist');
  const [colorScheme, setColorScheme] = useState('Blue and white');
  const [aesthetics, setAesthetics] = useState('Clean and professional');
  const [communicationStyle, setCommunicationStyle] = useState<string[]>([]);
  const [newStylePoint, setNewStylePoint] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [sampleText, setSampleText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);

  const { isLoading: isLoadingPersona } = useQuery({
    queryKey: ['persona', id],
    queryFn: () => personaApi.getById(id!).then((res) => {
        const p = res.data.persona;
        setName(p.name);
        setJobRole(p.jobRole);
        setExpertiseNodes(p.expertiseNodes);
        setExperienceVault(p.experienceVault);
        setTone(p.tone);
        setVisualStyle(p.visualDNA.style);
        setColorScheme(p.visualDNA.colorScheme);
        setAesthetics(p.visualDNA.aesthetics);
        if (p.communicationStyle) setCommunicationStyle(p.communicationStyle);
        setIsDefault(p.isDefault);
        return p;
    }),
    enabled: isEditing,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      isEditing ? personaApi.update(id!, data) : personaApi.create(data),
    onSuccess: () => {
      toast.success(isEditing ? 'Persona updated!' : 'Persona created!');
      navigate('/personas');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save persona');
    },
  });

  const handleAddExpertise = () => {
    if (newExpertise && !expertiseNodes.includes(newExpertise)) {
      setExpertiseNodes([...expertiseNodes, newExpertise]);
      setNewExpertise('');
    }
  };

  const handleRemoveExpertise = (expertise: string) => {
    setExpertiseNodes(expertiseNodes.filter((e) => e !== expertise));
  };

  const handleAddStylePoint = () => {
    if (newStylePoint && !communicationStyle.includes(newStylePoint)) {
      setCommunicationStyle([...communicationStyle, newStylePoint]);
      setNewStylePoint('');
    }
  };

  const handleRemoveStylePoint = (point: string) => {
    setCommunicationStyle(communicationStyle.filter((s) => s !== point));
  };

  const handleAnalyzeVoice = async () => {
    if (!sampleText || sampleText.length < 50) {
      toast.error('Please provide at least 50 characters of text to analyze.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data } = await personaApi.analyzeVoice(sampleText);
      const analysis = data.analysis;

      if (analysis.tone) {
        // Find matching tone or default to professional
        const matchedTone = tones.find(t => t.value === analysis.tone.toLowerCase())?.value || 'professional';
        setTone(matchedTone);
      }

      if (analysis.jobRole) setJobRole(analysis.jobRole);

      if (analysis.expertiseNodes && Array.isArray(analysis.expertiseNodes)) {
        // Merge new expertise with existing, avoiding duplicates
        const uniqueExpertise = new Set([...expertiseNodes, ...analysis.expertiseNodes]);
        setExpertiseNodes(Array.from(uniqueExpertise));
      }

      if (analysis.communicationStyle && Array.isArray(analysis.communicationStyle)) {
        const uniqueStyle = new Set([...communicationStyle, ...analysis.communicationStyle]);
        setCommunicationStyle(Array.from(uniqueStyle));
      }

      if (analysis.visualDNA) {
        if (analysis.visualDNA.style) {
            const matchedStyle = visualStyles.find(s => s.value === analysis.visualDNA.style.toLowerCase())?.value || 'minimalist';
            setVisualStyle(matchedStyle);
        }
        if (analysis.visualDNA.colorScheme) setColorScheme(analysis.visualDNA.colorScheme);
        if (analysis.visualDNA.aesthetics) setAesthetics(analysis.visualDNA.aesthetics);
      }

      toast.success('Voice analyzed! Persona updated with detected style.');
      setIsAnalyzeDialogOpen(false);
    } catch (error) {
      toast.error('Failed to analyze voice. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (expertiseNodes.length === 0) {
      toast.error('Add at least one expertise');
      return;
    }

    createMutation.mutate({
      name,
      jobRole,
      expertiseNodes,
      experienceVault,
      tone,
      visualDNA: {
        style: visualStyle,
        colorScheme,
        aesthetics,
      },
      communicationStyle,
      isDefault,
    });
  };

  if (isEditing && isLoadingPersona) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? 'Edit Persona' : 'Create Persona'}
        </h1>
        <p className="text-muted-foreground">
          Define your AI content persona for authentic LinkedIn posts
        </p>
      </div>

      <div className="flex justify-end mb-6">
        <Dialog open={isAnalyzeDialogOpen} onOpenChange={setIsAnalyzeDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Wand2 className="h-4 w-4" />
              Analyze My Voice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Analyze Voice & Style</DialogTitle>
              <DialogDescription>
                Paste a sample of your writing (LinkedIn post, blog, email) and we'll extract your unique voice.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Paste your content here..."
                rows={8}
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleAnalyzeVoice} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze & Apply'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Who is this persona?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Persona Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Tech Founder Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobRole">Job Role / Title</Label>
                <Input
                  id="jobRole"
                  placeholder="e.g., SaaS Entrepreneur & Startup Advisor"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Expertise Areas</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add expertise (e.g., Programmatic SEO)"
                    value={newExpertise}
                    onChange={(e) => setNewExpertise(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExpertise())}
                  />
                  <Button type="button" onClick={handleAddExpertise} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {expertiseNodes.map((expertise) => (
                    <Badge key={expertise} variant="secondary" className="gap-1">
                      {expertise}
                      <button
                        type="button"
                        onClick={() => handleRemoveExpertise(expertise)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Experience & Background</CardTitle>
              <CardDescription>What makes this persona unique?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience Vault</Label>
                <Textarea
                  id="experience"
                  placeholder="Describe key experiences, achievements, war stories, and unique perspectives..."
                  value={experienceVault}
                  onChange={(e) => setExperienceVault(e.target.value)}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  This helps the AI create authentic content based on real experiences
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voice & Style</CardTitle>
              <CardDescription>How should this persona communicate?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tone">Tone of Voice</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Signature Style / Hooks</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add style trait (e.g., Starts with a question)"
                    value={newStylePoint}
                    onChange={(e) => setNewStylePoint(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStylePoint())}
                  />
                  <Button type="button" onClick={handleAddStylePoint} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {communicationStyle.map((style) => (
                    <Badge key={style} variant="secondary" className="gap-1">
                      {style}
                      <button
                        type="button"
                        onClick={() => handleRemoveStylePoint(style)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visualStyle">Visual Style</Label>
                <Select value={visualStyle} onValueChange={setVisualStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visualStyles.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="colorScheme">Color Scheme</Label>
                <Input
                  id="colorScheme"
                  placeholder="e.g., Dark blue with neon accents"
                  value={colorScheme}
                  onChange={(e) => setColorScheme(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aesthetics">Aesthetics</Label>
                <Input
                  id="aesthetics"
                  placeholder="e.g., Modern, minimalist, professional"
                  value={aesthetics}
                  onChange={(e) => setAesthetics(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="default"
                  checked={isDefault}
                  onCheckedChange={(checked) => setIsDefault(checked as boolean)}
                />
                <Label htmlFor="default" className="font-normal">
                  Set as default persona
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditing ? 'Update Persona' : 'Create Persona'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/personas')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
